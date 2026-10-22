# Marketplace implementation status

## Implemented

- [x] PostgreSQL schema, migrations, stable marketplace user IDs and Drizzle queries.
- [x] Better Auth sign-up, verification, sign-in/out, recovery, database sessions and server-side roles.
- [x] Protected admin navigation with real dashboard metrics.
- [x] Product create/edit, category management, publish/draft and safe unpublishing.
- [x] Thumbnail/digital-file upload forms with server validation and upload limits.
- [x] Database-backed storefront, detail pages, search, category/price/rating filters, sorting and pagination.
- [x] Persistent cart state, dynamic cart badge and product-aware Buy now.
- [x] Server-priced checkout with a confirmed total before payment instructions.
- [x] Dynamic payment account settings and manual screenshot submission.
- [x] Admin review, required rejection reason, rejected-payment resubmission and duplicate submission protection.
- [x] Transactional/idempotent approval, reviewer/time metadata and payment notifications.
- [x] Approved-purchase downloads, private storage authorization and download counts.
- [x] Order history, wishlist add/remove, notification mark-read, verified reviews and profile name editing.
- [x] Consistent store currency formatting (USD default; configurable before entering prices).
- [x] Loading, empty, validation, request failure and saved/pending states for the main flows.

## Deployment configuration and validation

- [ ] Configure the production PostgreSQL URL, auth URL/secret, SMTP sender and Forge/S3 credentials.
- [ ] If existing MySQL data is needed, rehearse the read-only-source import and verified identity linking on staging first.
- [ ] Rehearse the complete purchase/download flow against the real hosted PostgreSQL and storage services before enabling real orders.

See README.md for setup and operating instructions. Automated and local browser checks do not perform a live data cutover.
