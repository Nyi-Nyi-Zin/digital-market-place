# Store pages and operations verification

Verified locally on 2026-10-25 (Asia/Rangoon).

Customer pages include individual order details with payment history, How to buy, About, refund/terms/privacy/license information, editable FAQ content, and persistent support requests/conversations. Admin pages include customer accounts and purchase histories, individual order details with private notes and payment/delivery actions, sales reports with CSV downloads, content/contact settings, support conversations, and an activity log. Footer, account, order list and sidebar links expose these pages.

## Code, database and builds

- All **153 tests across 19 test files passed**, including PostgreSQL integration tests. `node scripts/test-integration.mjs` created and removed a disposable database. New cases cover owner isolation, support replies/resolution/reopening, stale concurrent content edits, contact persistence, private notes, payment history, Myanmar date boundaries, accurate customer totals, and idempotent payment/delivery activity records.
- Root TypeScript checking, both apps' production build/type checks, app/package boundary checks and `git diff --check` passed. Local Node executables were used because the pnpm engine store lock was inaccessible in this environment.
- Migration `0003_store_support_operations.sql` was applied successfully to the configured **local** PostgreSQL database (`127.0.0.1:5432/digitalmarketplace`). The migration adds six tables and does not rewrite existing orders or payments.

## Browser evidence

**70 checks passed with zero uncaught JavaScript errors**, using installed Chrome, the production builds, real authenticated sessions and a separate disposable PostgreSQL database. No API interception supplied page data.

- Customer/admin support creation, request ownership, administrator reply, resolution, customer reply reopening, immediate list refresh after creation, and persisted messages/status.
- Delivery confirmation reflected on the customer order, immutable item titles, all payment attempts, private internal notes, and denial of another customer's order/request access.
- Customer pagination, real CSV download, contact setting publication, and per-language content publication visible on customer pages.
- Product/category create, update and archive/delete actions produced transactional activity records. Repeated deletion returned 404 without a false activity event.
- Public information pages, eight retained default FAQ questions, and all new admin screens rendered successfully.
- Screenshots and document overflow checks at **320, 390, 768 and 1440 CSS pixels**, five languages, light/dark themes, additional Myanmar checks at 320px, keyboard focus, and mobile drawer access at a 320×568 viewport.

Detailed check names and screenshots are in [`tmp/store-pages-qa/results.json`](../tmp/store-pages-qa/results.json) and the adjacent PNG files. Representative images are [`customer-320--account-purchases-1.png`](../tmp/store-pages-qa/customer-320--account-purchases-1.png), [`admin--reports.png`](../tmp/store-pages-qa/admin--reports.png), and [`admin-dark.png`](../tmp/store-pages-qa/admin-dark.png). The local runner is [`tmp/store-pages-qa.mjs`](../tmp/store-pages-qa.mjs). These ignored temporary artifacts are available in this workspace and are not deployment assets.

The browser fixture used ports **3185/3186** because this environment denied binding ports 3000/3001. Fixture accounts and records were disposable; the runner stopped its servers and removed the test database. The production builds used those local preview origins; deployment requires builds with the deployment's real origins as documented in the README.

## Operational limits

This is local source, database and browser evidence. No production deployment or production migration was performed, and no real-device, SMTP inbox, push-provider or live payment/storage delivery was tested. Support replies are website conversations with polling; they do not send email or browser push. Existing order/payment notifications retain their prior behavior.

Administrators can configure actual support hours, contact details and business policy text at `/settings/store`. Content is plain text, edited independently for each language and published immediately on save. Default policies describe the manual review/delivery workflow without inventing delivery deadlines or automatic refunds. Activity history starts with this update and does not reconstruct earlier actions.
