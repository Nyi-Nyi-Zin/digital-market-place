# Google and Telegram sign-in

Implemented on 2026-10-25 for the independent customer and admin applications.

- Google: sign in on both sites; customer registration; same-email linking only when the existing local email is verified. Admin registration stays disabled and database role checks still guard admin pages/APIs.
- Telegram: sign in to an existing verified account using email/password or Google, then open **Account → Connect Telegram** once. Later, use **Continue with Telegram** on either site's sign-in page. Telegram never creates an account or supplies a replacement email; its verified OIDC subject chooses an explicitly connected identity.
- Both apps preserve safe `next` destinations, separate host-only sessions, localized errors and pending/retry states. All new messages cover English, Burmese, Thai, Japanese and Chinese. Missing provider credentials disable the corresponding button.

## Setup required for live login

Follow [README setup](README.md#google-and-telegram-oauth-sign-in) and [.env.example](.env.example). Save Google and Telegram OIDC client IDs/secrets in the ignored root `.env` or deployment server environment, register both sites' exact provider callback URLs, then restart both sites. Telegram uses BotFather's Login Widget OIDC credentials, not a Bot API token. No database migration is needed.

Real Google/Telegram credentials are absent locally. Actual provider consent, production callback registration and live provider login remain unverified. No deployment was performed.

## Verification

- `npm run check`: passed both apps' route/type generation, TypeScript and package/import boundaries.
- `npm run build`: both customer and admin production builds passed. This verifies compilation and generated artifacts; it is not a deployment or live OAuth test.
- `node scripts/test-integration.mjs`: **175 tests passed**, including real PostgreSQL sessions/account writes. The runner created and removed a disposable local database.
- Google callback tests mock only the external identity/code exchange while testing actual state/PKCE, cookies, linking, customer registration, admin signup rejection, verified-email policy, error callbacks and external redirect rejection.
- Telegram tests use the actual generic OAuth implementation with locally signed RSA tokens and mocked Telegram discovery/token/JWKS network endpoints. They cover account linking, subsequent login across both apps, identity/role/email preservation, unconnected identities, unverified local emails, reassignment prevention, and rejection of invalid signatures, issuer, audience, expiry and nonce.
- Browser QA: **33 checks passed**, zero uncaught browser errors. Chrome tested 1440px, 390px and 320px layouts, both OAuth request payloads, pending/error/retry, safe redirects, five locales, real password login against a disposable database, profile linking requests, customer registration and absent-credential/password-recovery states. OAuth button/link responses were mocked; this is not evidence of live provider login. Isolated source copies ran on ports 3100/3101, then their processes/database were removed.

Browser artifacts: [results](tmp/oauth-browser-qa/results.json), [customer mobile](tmp/oauth-browser-qa/customer-signin-390.png), [admin mobile](tmp/oauth-browser-qa/admin-signin-390.png), [customer desktop](tmp/oauth-browser-qa/customer-signin-1440.png), [admin desktop](tmp/oauth-browser-qa/admin-signin-1440.png), [customer account](tmp/oauth-browser-qa/customer-account-320.png), [admin account](tmp/oauth-browser-qa/admin-account-320.png).

## Layout correction on 2026-10-25

The email/password form and submit button now come first, followed by the divider and Google/Telegram buttons. Customer sign-up uses the same order for Google. The divider copy is updated in all five languages. Live HTML responses from customer sign-in, customer sign-up and admin sign-in confirm this order. The earlier screenshot links above show the previous placement; no new browser capture was performed for this layout correction.
