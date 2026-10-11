# Antigravity entitlement desync — `paidTier=g1-pro-tier` vs `currentTier=free-tier`

Report date: 2026-10-08
Scope: Google Antigravity (2.0 desktop, IDE, CLI) + Gemini Code Assist backend
Accounts: 3 Google AI Pro via the Jio offer + 1 family-group member

## Summary

Google AI Pro accounts are recognized at the subscription layer but the paid tier is not
applied at the Code Assist / Antigravity backend. The backend reports both tiers at the
same time and serves the free one. All client-side remediation (including full
sign-in/out cycles on every surface and fresh OAuth consent) has no effect. Pro-only
model routes are not provisioned for the accounts.

## Clients (latest)

- Antigravity 2.0 desktop v2.21.1 (Linux)
- Antigravity IDE v2.5.5 (Linux)
- Antigravity CLI `agy` v1.3.1

## Accounts and test matrix

| Account | Origin | Sign in/out on desktop+IDE+CLI | Age verified | Result |
|---|---|---|---|---|
| joshuaadair.hr@gmail.com | Jio Google AI Pro | yes | yes | free-tier |
| hrjoces22@gmail.com | Jio Google AI Pro | yes | yes | free-tier |
| hrjosh064@gmail.com | family-group member | yes | yes | free-tier |
| florecitadelcampo.gtz@gmail.com | Jio Google AI Pro | re-auth only (control) | no | free-tier |

## Key backend evidence

Fresh token per account. `POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist`
returns, simultaneously:

```json
{
  "currentTier": { "id": "free-tier", "name": "Antigravity",
                   "upgradeSubscriptionType": "GOOGLE_ONE" },
  "paidTier": {
    "id": "g1-pro-tier",
    "name": "Google AI Pro",
    "description": "Google AI Pro",
    "upgradeSubscriptionUri": "https://antigravity.google/g1-upgrade",
    "upgradeSubscriptionText": "You can upgrade to a Google AI Ultra plan to receive higher rate limits."
  },
  "allowedTiers": [
    { "id": "free-tier", "isDefault": true },
    { "id": "standard-tier", "userDefinedCloudaicompanionProject": true, "usesGcpTos": true }
  ],
  "cloudaicompanionProject": "aicode-consumers",
  "gcpManaged": false
}
```

The plan is recognized (`paidTier = g1-pro-tier`) but the free tier is applied
(`currentTier = free-tier`). Identical response for all four accounts.

## Client logs

Desktop v2.21.1, after a clean-profile sign-in (joshuaadair.hr and hrjoces22):

```
[AuthProvider] SetProjectID called with projectID: ""
[AuthProvider] SetLocation called with location: ""
[AuthProvider] SetUserTier called with userTier: "", tierDisplayName: ""
```

IDE v2.5.5, after sign-in:

```
Failed to get OAuth token: error getting token source from auth provider:
state syncing error: key not found
```

CLI `agy` v1.3.1: after a fresh sign-in the model list shows no `(Google AI Pro)` status;
only `claude-sonnet-4-6` / `claude-opus-4-6-thinking`.

## Model route probe (bypassing the picker / fetchAvailableModels)

Requests built with the same production request path (signed Antigravity request), prod and
daily endpoints. Uniform across all four accounts:

| Model | HTTP | Result |
|---|---|---|
| gemini-3.8-flash-tiered | 200 | control OK |
| claude-sonnet-4-6 | 200 | control OK |
| claude-opus-4-6-thinking | 200 | control OK |
| claude-opus-5-5 | 404 | NOT_FOUND |
| gemini-4-argon | 404 | NOT_FOUND |

`claude-opus-5-5` is a real slug present in the `agy` v1.3.1 binary and in the hub
`language_server` (2.21.1) but the backend returns 404 — the Pro model route is not
provisioned for these accounts. `gemini-4` / Argon is absent from every client and from the
backend (not yet rolled out to Antigravity).

Client slug inspection:

```
agy v1.3.1                     : knows "claude-opus-5-5"
hub language_server 2.21.1     : knows "claude-opus-5-5"
IDE language_server 2.5.5      : does not know 5.5
none                           : "gemini-4" / "argon" / "gemini-3.9"
```

## Additional backend checks

- `loadCodeAssist` (daily endpoint) -> `currentTier = free-tier`
- `loadCodeAssist` with `metadata.duetProject` -> `currentTier = free-tier`
- `onboardUser { tierId: "free-tier" }` -> `done:true`, project `aicode-consumers`;
  a following `loadCodeAssist` still returns `free-tier`
- `fetchAvailableModels` -> 27 models; only Claude 4.6 + gpt-oss-120b; no Claude 5.5

Note on access: the accounts keep the free baseline, which *includes* Gemini 3.x, Claude
4.6 and GPT-OSS-120b (per the official models table), so requests succeed and the weekly
quota does not exhaust quickly. What is missing is the paid tier: Claude 5.5 and Pro quota.

## Already tried, no effect

- Reset Onboarding (IDE); clean app profiles; full sign-out/in on desktop, IDE and CLI
- Latest versions everywhere (2.21.1 / 2.5.5 / 1.3.1)
- Fresh OAuth consent (`prompt=consent`) for every account; credentials cleared and re-added
- Age verification completed (3 accounts); region supported; no VPN/proxy

## Request

Please re-sync / re-issue the consumer entitlement so that the paid tier
(`paidTier = g1-pro-tier`) is applied as `currentTier` in the Code Assist / Antigravity
backend, or advise which condition between `paidTier` and `currentTier` is failing.

## Related public reports

- discuss.ai.google.dev/t/.../185483 — staff: "known state synchronization bug ... Reset
  Onboarding / agy logout / agy login"
- discuss.ai.google.dev/t/.../179252 — staff: "Jio-partner AI Pro now recognized ... if it
  persists, reach out"
- discuss.ai.google.dev/t/.../186590 — Claude 5.5 missing on a Jio-provided Pro plan
