# Customer UI refinement

Date: 2026-10-27 (Asia/Rangoon)

## Delivered

- Customer-only theme refinements: alabaster/white light surfaces, obsidian/elevated dark surfaces, electric-purple actions, restrained borders, shadows and heading rhythm.
- Radix sort and collection selectors, compact active filters, blurred filter overlay, currency-aware price prefixes and balanced modal actions.
- Product cards use centered 16:10 covers, hover zoom, blurred badges and purple hover actions.
- Account quick actions use four desktop columns, two tablet columns and one mobile column. Profile fields share a desktop row; save/reset actions share a compact footer. Unavailable Telegram linking becomes one integration card.
- Customer accounts have no admin CTA, admin destination or role label, including when the signed-in account has the admin role. The admin application was not edited.
- Auth forms are constrained to 448px, with a mesh/grid brand panel. Unconfigured OAuth providers are hidden.
- Cart rows have tinted thumbnail frames and right-aligned removal controls. Desktop summaries are sticky; the manual-payment notice has its own shield callout.
- FAQ uses an accessible Radix accordion with rotating chevrons, animated height/opacity, active borders and reduced-motion support. Support topics precede separate direct-contact channels.
- Added the two new customer labels in English, Myanmar, Thai, Japanese and Chinese. Shared changes are limited to those translation entries.

## Verification

The customer production build passed with `CIRCLE_NODE_TOTAL=2`. Customer TypeScript, app/package boundaries, all 19 Tailwind stylesheets, scoped Prettier and whitespace checks passed.

Browser checks used headless Chrome and the production build with a disposable local PostgreSQL database. Only fixture identities and fixture records were mutated. Storage images were intercepted with a local PNG; these checks do not establish live Cloudinary health.

Result: 143 passing browser checks (48 public layouts and 95 interaction/account/locale checks), zero runtime errors. Fixture database removal was verified after cleanup.

- Public routes `/`, `/sign-in`, `/forgot-password`, `/cart`, `/support` and `/faq` fit 320, 390, 768 and 1440px in light and dark themes.
- Product aspect ratio and image sizing were asserted. Sort updates the URL; collection/price submission, reset and clear-all preserve the expected filters and sort.
- Collection menus and filter dialogs fit 320 and 1440px in both themes. Viewport screenshots were used for portaled menus because full-page Chrome captures produced compositing artifacts.
- Customer and admin fixture accounts both receive the customer dashboard, with no admin destinations or role labels. Account layouts fit all four widths in both themes.
- Profile saving passes through the auth API and persists the name in the fixture database.
- Adding a product, populated-cart layout, sticky desktop summary, removal and the empty state passed.
- All five locales were checked at 320px in both themes with full navigation, actual `html[lang]`, translated visible headings and no horizontal overflow. The new Telegram status label was also asserted.
- FAQ keyboard expansion/collapse, accessible expanded state and reduced-motion behavior passed.

The preview ran on port 3188. For auth mutation checks, a test request proxy supplied the production build's configured local trusted Origin header; application origin/CSRF protections were not changed. This verifies local UI/API/database behavior, not deployment-origin configuration.

React review: server-rendered data/auth boundaries remain intact, the accordion receives serializable text, Select state derives from URL filters, icons are decorative, inputs retain labels and forms retain pending/error handling.

## Evidence

- [Combined results](tmp/customer-ui-qa/combined-results.json)
- [Public layout results](tmp/customer-ui-qa/public-layout-results.json)
- [Interaction and locale results](tmp/customer-ui-qa/results.json)
- [Dark account desktop](tmp/customer-ui-qa/dark-account-1440.png)
- [Light account mobile](tmp/customer-ui-qa/light-account-390.png)
- [Dark storefront mobile](tmp/customer-ui-qa/dark-home-390.png)
- [Dark collection menu mobile](tmp/customer-ui-qa/dark-collection-320.png)
- [Populated cart desktop](tmp/customer-ui-qa/filled-cart-1440.png)
- [Populated cart mobile](tmp/customer-ui-qa/filled-cart-390.png)
- [Myanmar auth mobile](tmp/customer-ui-qa/my-dark-sign-in-320.png)
- [Myanmar FAQ mobile](tmp/customer-ui-qa/my-light-faq-320.png)

No deployment, real-device testing, live OAuth/email, payment submission or live storage verification was performed. Existing manual payment review and delivery behavior was preserved. The fixture server and disposable database are cleaned up by the runner.

## Development runtime recovery

On 2026-10-27 the customer reported undefined `.call` failures in generated `.next-dev` bundles for Support and FAQ. The first HTTP probe against the then-running server returned 200, so the exact exception was not reproduced in this follow-up. To remove stale generated state, the customer process on port 3000 was stopped, `customer-web/.next-dev` was archived under `tmp/customer-runtime-recovery/`, and the customer dev server was restarted with the normal project environment. The admin listener on port 3001 remained running. No application source changes were required for this recovery.

Direct browser verification against the fresh development server passed 14 checks with zero runtime/console errors: both routes return 200, both reload successfully, client navigation works in both directions, FAQ keyboard expansion works, and both pages fit 390/1440px in light/dark themes. No database records were changed. Customer dev remains running on port 3000.

Evidence: [development results](tmp/customer-runtime-recovery/results.json), [server output](tmp/customer-runtime-recovery/customer-dev.stdout.log), [server errors](tmp/customer-runtime-recovery/customer-dev.stderr.log), [Support desktop](tmp/customer-runtime-recovery/dark-support-1440.png), [FAQ mobile](tmp/customer-runtime-recovery/light-faq-390.png).
