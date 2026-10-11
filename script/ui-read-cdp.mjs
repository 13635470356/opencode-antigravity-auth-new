/**
 * ui-read-cdp.mjs
 *
 * Reads the Antigravity desktop UI (v2.x, Electron) over its DevTools protocol
 * instead of the API. Prints, from the real rendered UI:
 *   - Settings -> Account   : plan ("Your Plan: ...") + email
 *   - Settings -> Models    : plan + quota buckets (weekly / 5h)
 *
 * Usage (runs ON the machine where the Antigravity desktop app runs):
 *   node script/ui-read-cdp.mjs [cdpPort]
 *   # default cdpPort = 42935
 *
 * Find the port from the app log line:
 *   "DevTools listening on ws://127.0.0.1:<PORT>/devtools/browser/..."
 * or:  curl -s http://127.0.0.1:<PORT>/json/version
 */

const port = process.argv[2] || "42935";

const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
const target = list.find((x) => x.type === "page");
if (!target) {
  console.log("No page target on CDP. Is the Antigravity desktop app running?");
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
function send(method, params) {
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Page.enable");

const base = target.url.split("?")[0];
const screens = ["Account", "Models"];
for (const s of screens) {
  await send("Page.navigate", { url: `${base}?settingsOpen=true&settingsScreen=${s}` });
  await new Promise((r) => setTimeout(r, 2500));
  const r = await send("Runtime.evaluate", {
    expression:
      "(() => { const lines=(document.body.innerText||'').split('\\n'); return lines.slice(-40).join('\\n'); })()",
    returnByValue: true,
  });
  const txt = (r.result && r.result.result && r.result.result.value) || "";
  console.log(`===== Settings -> ${s} =====`);
  console.log(txt);
}

ws.close();
