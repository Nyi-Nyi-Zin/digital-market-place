# Independent customer and admin Next.js projects

Local verification on 2026-10-23. The current projects are `customer-web/` and `admin/`; this report supersedes the earlier route-wrapper implementation in `apps/`.

## Implementation

- Both projects own their app routes, components, CSS, assets, package manifests, direct dependencies, TypeScript/Next.js configuration and build output. Neither imports the other.
- `packages/server` contains database/schema, authentication, storage and business logic. `packages/shared` contains client-safe validation, public types, formatting and the five locale dictionaries.
- Customer styling and shopping behavior are preserved. Its account/form utilities are now customer-owned CSS rather than an import of the admin stylesheet.
- Admin owns the sidebar, mobile drawer, topbar, management screens, profile, login/recovery and error pages. Its theme key is `cloud-nine-admin-theme`; customer keeps `cloud-nine-theme`.
- Existing API contracts, the shared PostgreSQL database, separate session cookies, role checks, registration restrictions and cross-site redirects remain intact. Comparing the schema's printed TypeScript AST with the pre-migration copy confirmed that the database schema did not change.
- The former `app/` and `apps/` source trees were retired without a broad reset or restore. Subsequent cleanup removed the archived source and redundant facades after current tests were moved to `tests/`. Local backup and QA folders were retained.

## Static and integration checks

- Root `check` passed: route type generation for both apps, root/shared and both app TypeScript checks, and import/dependency boundary validation.
- Both final production builds passed, including standalone output. Windows builds use a narrowly scoped directory-junction adapter for Next 15's pnpm directory links.
- All 88 Vitest tests passed with PostgreSQL integration enabled against a newly created disposable database. This includes cookie isolation, disabled admin registration, payment state transitions and storage permissions on both apps. The added skip-link translations also passed all eight i18n checks after the translation update.
- Prettier and `git diff --check` passed.

## Browser checks

Chrome/Playwright used two temporary local servers and a separate disposable PostgreSQL database.

- Anonymous admin access, ordinary-user rejection, disabled admin sign-up, separate sign-in cookies and independent admin sign-out were verified.
- All six management destinations and the separate admin profile worked; profile edits persisted through Better Auth to PostgreSQL.
- Admin writes appeared in the customer catalogue. Customer Buy now opened checkout; browser order creation persisted the server-confirmed total. Approving a locally seeded payment through the admin UI appeared in customer purchase history.
- Both sites were checked at 320, 390, 1024 and 1440 pixels, in light/dark and English, Myanmar, Thai, Japanese and Chinese. Admin checks wait for the heading and data table, rather than accepting the loading state. Drawer focus trapping, Escape and focus restoration were checked on mobile.
- Admin login, recovery and not-found layouts fit all target widths. No uncaught browser errors were recorded.

Historical browser screenshots and JSON evidence remain in ignored `tmp/workspace-qa/`; the verified outcomes are summarized here.

## Independent runtime artifacts

- Each final package contains 35 traced runtime packages. The materialized artifacts contain no links to workspace `node_modules`, counterpart app source, archived Vite/tRPC source or unused AWS/chart/legacy UI packages.
- Both were copied to a system temporary directory outside the repository and started successfully. Pages, their CSS/JS assets, database-backed session endpoints and route/API separation passed there.
- Independent source `start` commands for both apps also served their sign-in pages and session endpoints successfully.
- Generated artifacts and temporary verification JSON were removed during cleanup. Use the documented package commands to regenerate artifacts for the deployment operating system.

## Limits

No production deployment, domain/DNS change or production database migration was performed. Browser payment evidence was inserted only into the disposable database; real payment transfers, Cloudinary upload/download and SMTP delivery were not exercised. Integration and browser fixtures are local verification, not production-service verification.

## Subsequent workspace cleanup

Obsolete Vite/tRPC code, root compatibility facades, template files, old report files, unused dependency entries and obsolete root build/cache artifacts were removed. Current tests live in `tests/`; the single obsolete tRPC logout test was removed with the old server, while current Better Auth session/sign-out integration coverage remains. All 87 current tests passed against a disposable PostgreSQL database, as did type checks and both production builds. PostgreSQL/MySQL migration history, migration/recovery commands, environment files, selected local backup/QA folders and both active Next.js projects are retained.
