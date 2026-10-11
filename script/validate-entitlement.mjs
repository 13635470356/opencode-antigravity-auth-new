/**
 * validate-entitlement.mjs
 *
 * Read-only entitlement validation for every Antigravity account stored in
 * ~/.config/opencode/antigravity-accounts.json. For each account it:
 *   1. forces a fresh access token (refresh),
 *   2. reads the Google account identity (userinfo),
 *   3. queries loadCodeAssist on prod and daily (the tier source of truth),
 *   4. re-runs onboarding (tierId=free-tier) and re-checks the tier,
 *   5. lists available models and flags Claude 5.5 / Argon / Gemini 4.
 *
 * Usage (no args = all accounts):
 *   node script/validate-entitlement.mjs [email-substring]
 *
 * Requires a prior `npm run build` (imports ./dist). No secrets are printed.
 */

import { loadAccounts } from "../dist/src/plugin/storage.js";
import { refreshAccessToken } from "../dist/src/plugin/token.js";
import { formatRefreshParts, accessTokenExpired } from "../dist/src/plugin/auth.js";
import { resolveCachedAuth } from "../dist/src/plugin/cache.js";
import { getAntigravityHeaders } from "../dist/src/constants.js";

const PROD = "https://cloudcode-pa.googleapis.com";
const DAILY = "https://daily-cloudcode-pa.googleapis.com";
const META = { ideType: "ANTIGRAVITY", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" };
const H = { ...getAntigravityHeaders(), "Content-Type": "application/json" };
const MOCK_CLIENT = { tui: { showToast: async () => {} } };

const filter = (process.argv[2] || "").toLowerCase();

async function access(acc) {
  const base = {
    type: "oauth",
    refresh: formatRefreshParts({
      refreshToken: acc.refreshToken,
      projectId: acc.projectId,
      managedProjectId: acc.managedProjectId,
    }),
    access: "",
    expires: 0,
  };
  let auth = resolveCachedAuth(base);
  if (!auth.access || accessTokenExpired(auth)) {
    auth = (await refreshAccessToken(base, MOCK_CLIENT, "google")) ?? auth;
  }
  return auth.access;
}

async function loadCodeAssist(base, token, metadata) {
  const r = await fetch(`${base}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers: { ...H, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ metadata: metadata || META }),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

async function availableModels(token, project) {
  const r = await fetch(`${PROD}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: { ...H, Authorization: `Bearer ${token}` },
    body: JSON.stringify(project ? { project } : {}),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

const storage = await loadAccounts();
if (!storage || storage.accounts.length === 0) {
  console.log("No accounts configured.");
  process.exit(0);
}

const rows = [];
for (const acc of storage.accounts) {
  if (filter && !(acc.email || "").toLowerCase().includes(filter)) continue;

  console.log(`\n================ ${acc.email} ================`);
  let token = "";
  try {
    token = await access(acc);
  } catch (e) {
    console.log(`  refresh: FAIL ${e.message}`);
    continue;
  }
  console.log(`  refresh: OK`);

  const ui = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "antigravity" },
  })
    .then((r) => r.json())
    .catch(() => ({}));
  console.log(`  userinfo: email=${ui.email || "?"} verified=${ui.verified_email} hd=${ui.hd || "-"}`);

  const p1 = await loadCodeAssist(PROD, token);
  const tierProd = p1.json?.currentTier?.id ?? "(vacio)";
  const allowed = (p1.json?.allowedTiers || []).map((x) => x.id).join(",");
  const upgrade = p1.json?.currentTier?.upgradeSubscriptionType ?? "-";
  console.log(`  prod  loadCodeAssist: http=${p1.status} tier=${tierProd} allowed=[${allowed}] upgrade=${upgrade}`);
  console.log(`  prod  project: ${JSON.stringify(p1.json?.cloudaicompanionProject ?? null)}`);

  const pid = acc.managedProjectId || acc.projectId;
  const p2 = await loadCodeAssist(PROD, token, { ...META, ...(pid ? { duetProject: pid } : {}) });
  console.log(`  prod  loadCodeAssist(duetProject=${pid || "-"}): tier=${p2.json?.currentTier?.id ?? "(vacio)"}`);

  const d1 = await loadCodeAssist(DAILY, token);
  console.log(`  daily loadCodeAssist: http=${d1.status} tier=${d1.json?.currentTier?.id ?? "(vacio)"}`);

  const ob = await fetch(`${PROD}/v1internal:onboardUser`, {
    method: "POST",
    headers: { ...H, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tierId: "free-tier", metadata: { ...META, ...(pid ? { duetProject: pid } : {}) } }),
  })
    .then((r) => r.json())
    .catch(() => ({}));
  console.log(`  onboardUser(free-tier): done=${ob.done} project=${ob.response?.cloudaicompanionProject?.id ?? "-"}`);

  const p3 = await loadCodeAssist(PROD, token);
  const tierPost = p3.json?.currentTier?.id ?? "(vacio)";
  console.log(`  prod  loadCodeAssist(post-onboard): tier=${tierPost}`);

  const m = await availableModels(token, pid);
  const ids = Object.keys(m.json?.models || {});
  const claude = ids.filter((x) => /claude/i.test(x));
  const gpt = ids.filter((x) => /gpt/i.test(x));
  const newer = ids.filter((x) => /5[-_.]?5|opus-5|sonnet-5|argon|gemini-4/i.test(x));
  console.log(`  models: http=${m.status} count=${ids.length}`);
  console.log(`    claude=[${claude.join(",")}]`);
  console.log(`    gpt=[${gpt.join(",")}]`);
  console.log(`    5.5/argon/gemini-4=[${newer.join(",") || "ninguno"}]`);

  rows.push({ email: acc.email, tierProd, tierPost, daily: d1.json?.currentTier?.id ?? "(vacio)", count: ids.length, claude: claude.join("|"), gpt: gpt.join("|"), newer: newer.join("|") });
}

console.log("\n================ RESUMEN ================");
for (const r of rows) {
  console.log(`${r.email}\n  prod=${r.tierProd} post-onboard=${r.tierPost} daily=${r.daily} models=${r.count}\n  claude=[${r.claude}] gpt=[${r.gpt}] nuevo=[${r.newer}]`);
}
