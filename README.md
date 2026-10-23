# Cloud Nine digital marketplace

Two Next.js App Router sites + shared PostgreSQL, Drizzle ORM and Better Auth.

## Customer and admin sites

Two independent Next.js projects live directly under this workspace root:

| Site     | Project         | Local URL               | Routes                                                                                   |
| -------- | --------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Customer | `customer-web/` | `http://localhost:3000` | Catalogue, products, cart, checkout, account, sign-up and recovery                       |
| Admin    | `admin/`        | `http://localhost:3001` | Overview, products, categories, orders, payments, payment settings, profile and recovery |

Each app owns its routes, components, CSS, public assets, package manifest, dependencies, Next.js/TypeScript configuration and build output. Neither app imports the other. The customer visual identity and ordering behavior are preserved. Admin has its own responsive sidebar/drawer, topbar, login, profile and light/dark styles; its theme uses `cloud-nine-admin-theme`, independently of the customer theme.

`packages/server` owns PostgreSQL/Drizzle schema and business logic, Better Auth and Cloudinary access. `packages/shared` owns client-safe validation, public types, formatting and the five locale dictionaries. Both sites access the same database through these explicit workspace packages; no separate API service or data migration is needed. Runtime dependencies are declared where used. The root manifest contains tooling/test dependencies only, and pnpm manages one workspace lockfile.

Run `pnpm install --frozen-lockfile`, then `pnpm dev` for both sites. Use `pnpm dev:customer` / `pnpm dev:admin`, or `pnpm --filter @marketplace/customer dev` / `pnpm --filter @marketplace/admin dev`, to run one. The same filters support `check`, `build` and `start`. Stop an older preview using ports 3000/3001 before launching these apps.

Launchers load the root `.env` without overriding provided environment variables. Development outputs are `customer-web/.next-dev` and `admin/.next-dev`; production outputs are each app's `.next`. Each deployment receives its own server environment, while database/storage settings point to the shared services. Set `NEXT_PUBLIC_CUSTOMER_URL` and `NEXT_PUBLIC_ADMIN_URL` to different origins and rebuild after changing them. Each site's `BETTER_AUTH_URL` is derived from its own origin.

Customer admin APIs and admin shopping routes are absent. Customer `/admin/*` redirects to the matching admin URL, preserving queries. Admin has no public sign-up; create a customer identity, verify it, and grant the administrator role using the trusted CLI. Admin role checks and separate host-only auth cookies remain enforced; signing out of one site preserves the other session.

### Independent production artifacts

`pnpm build:customer` and `pnpm build:admin` each create Next.js standalone output. On Windows, the build launcher uses directory junctions for Next 15's pnpm links so the build needs no symlink privilege. On deployment platforms, use the native standalone output and copy that app's `public` and `.next/static` directories as described in the Next.js standalone documentation.

For a local artifact with traced runtime packages materialized and no links back to workspace `node_modules`, run `pnpm package:customer` or `pnpm package:admin` after building. The command prints a fresh `dist/<app>-<timestamp>/` directory and its server entrypoint. It includes only traced runtime packages and fails explicitly if traced versions cannot be flattened safely. Provide the deployment's server environment and `PORT` when starting the printed entrypoint. Artifacts include platform-specific dependencies; build/package on the target operating system.

`pnpm check` verifies both apps, shared code and import/dependency boundaries. Current regression tests live in `tests/`; `pnpm test:integration` runs them against a newly created disposable local PostgreSQL database and removes it afterward. Obsolete Vite/tRPC source, compatibility facades and template configuration have been removed. Database migration history and the explicit MySQL import/identity recovery tools are retained.

## Local setup

Use Node.js 22 or newer and the package manager pinned in `package.json`.

1. Copy `.env.example` to `.env` and set a random `BETTER_AUTH_SECRET` (at least 32 characters).
2. Start PostgreSQL, for example `POSTGRES_PASSWORD=<local-password> docker compose up -d`.
3. Set `DATABASE_URL` to that PostgreSQL database. Use `NEXT_PUBLIC_CUSTOMER_URL=http://localhost:3000` and `NEXT_PUBLIC_ADMIN_URL=http://localhost:3001`.
4. Run `pnpm install --frozen-lockfile`, then `pnpm db:migrate` and `pnpm dev`.
5. Open `http://localhost:3000/sign-up`. Configure SMTP to test email verification and recovery. Admin sign-in is at `http://localhost:3001/sign-in`.

The site launchers/configurations load the root `.env`. Database CLI scripts import `dotenv/config` and use the same file. The PostgreSQL example password is for local development only.

## Authentication

Better Auth owns `/api/auth/[...all]`. Register, sign in, sign out, password recovery, and database sessions no longer require Manus OAuth credentials. `/api/auth/me` returns the marketplace user. New identities receive the ordinary `user` role; the public sign-up request cannot choose a role.

SMTP delivery (`SMTP_HOST`, `SMTP_PORT`, optional `SMTP_USER`/`SMTP_PASSWORD`, and `MAIL_FROM`) is required in production. SMTP-enabled environments require verified email before sign-in. Development without SMTP permits local sign-up/sign-in, but cannot send recovery links. No reset or verification tokens are printed to logs. `BETTER_AUTH_URL` must match the actual application origin; use HTTPS in production.

After registering, verifying, and visiting `/account`, promote an account from the trusted server CLI:

```bash
pnpm admin:grant -- admin@example.com
```

Admin pages and their API handlers enforce the database-backed marketplace role. Session cookie caching is intentionally disabled so sign-out/revocation is checked against the database. Auth rate limits are stored in PostgreSQL for consistency across app instances.

## Database changes

- `pnpm db:generate`: create a reviewed PostgreSQL migration after schema changes.
- `pnpm db:migrate`: apply committed migrations from `drizzle/postgres`.
- `pnpm db:push`: development-only direct schema synchronization; do not use on production.

The old MySQL schema and migrations are archived under `drizzle/legacy-mysql`. They are never run by the PostgreSQL migrator. Production data is not migrated automatically when the application starts or builds.

## Existing MySQL data

Back up MySQL and put the old application in maintenance mode before cutover. Rehearse the following on a staging copy first:

1. Create a **new, empty PostgreSQL database**, set its `DATABASE_URL`, and run `pnpm db:migrate`.
2. Provide a read-only `LEGACY_MYSQL_URL`, then run `pnpm db:import-mysql`. The importer reads a consistent snapshot, preserves numeric marketplace IDs, verifies table row counts, and inserts the target records in a transaction. It aborts on a non-empty target or a constraint failure. It does not delete or update MySQL data.
3. Reconcile order/payment totals and sample purchase/download access against the source before enabling writes on the new application.
4. Existing OAuth sessions and Manus passwords cannot be transferred. Customers register and verify a new Better Auth identity. **Do not automatically match accounts by email.** After independently verifying ownership, an operator may link the new auth ID to the original marketplace ID:

```bash
pnpm auth:link-legacy -- <original-marketplace-user-id> <verified-auth-user-id> --ownership-verified
```

The link command retains the original role and purchase records. It refuses automatic merging if the newly created marketplace account already owns records. Review ambiguous/duplicate emails and other conflicts manually. Keep MySQL and its backup intact until cutover has been validated. Rollback requires reconciling any new writes made after cutover.

## Validation

```bash
pnpm check
pnpm test
pnpm build
```

Integration tests run only when `TEST_DATABASE_URL` is explicitly set to an empty, disposable PostgreSQL database. They create an isolated schema and never target the default application database.

Storage uses Cloudinary directly, independently of authentication. The admin and customer flows use the live PostgreSQL catalogue. No sample products are returned when a database query is empty.

## Cloudinary storage

1. Create a Cloudinary account and find your Cloud name, API key and API secret in the Cloudinary Console API Keys settings.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in the root `.env` locally and in the server environment for **both** deployments. Keep the secret server-side; do not add a `NEXT_PUBLIC_` prefix. Restart both sites after changing credentials. No unsigned upload preset, AWS account or Manus service is required.
3. Product thumbnails are uploaded as public `image/upload` assets. Payment screenshots use `image/authenticated`, and optional product files use `raw/authenticated`, so originals and derived assets are protected. The `/storage/...` route checks database ownership, payment approval or the administrator role before issuing a private download URL valid for five minutes. These links are bearer links until expiry; redirects and errors use `private, no-store`.
4. Image uploads remain limited to 5 MB. `CLOUDINARY_MAX_FILE_MB` defaults to **10**, matching the Free plan raw-file limit. Raise it only if your Cloudinary plan supports it; this app caps it at 25 MB. Free credits are shared by storage, bandwidth and transformations. If delivering PDFs/ZIP archives, enable **Allow delivery of PDF and ZIP files** in the Cloudinary product environment's Security settings.

Existing files are **not** transferred automatically. New database file keys start with `cloudinary/` and preserve their resource and delivery types. Legacy keys return 404; re-upload thumbnails/product files and update the corresponding database keys. Historical payment evidence must be uploaded as authenticated assets and its payment record updated through a controlled migration before cutover. Preserve original evidence and database backups until verified. There is no fallback to the old storage service. The header keeps its existing cloud icon and favicons are bundled locally.

See [Cloudinary access controls](https://cloudinary.com/documentation/control_access_to_media), [plan limits](https://cloudinary.com/pricing/compare-plans) and [PDF/ZIP delivery settings](https://cloudinary.com/documentation/image_delivery_options#blocked_delivery_formats). Local tests mock uploads; a real upload and authorized download should be checked after configuring your own account.

## Marketplace operations

On the admin site (`http://localhost:3001` locally):

- `/`: real revenue, order and payment counts; recent orders.
- `/categories`: create/edit/delete categories (database constraints prevent deleting a category that still contains products).
- `/products`: create/edit products, upload a thumbnail, publish/draft, feature and unpublish products. Digital products are delivered manually after payment approval; publishing does not require a file upload. Unpublishing preserves existing purchases.
- `/orders`: customer/order details, item snapshots and payment status.
- `/payments`: inspect screenshots, approve or reject with a reason, and see the reviewer/time. Approval is transactional and cannot increase sales twice.
- `/settings/payment`: create/update and enable/disable KBZPay, AYA Pay and WavePay account details. New installations start with no enabled accounts.

A new installation needs an admin account, a category, a published product and an enabled payment method before it can accept an order. Uploads require Cloudinary configuration. Thumbnail and payment evidence uploads accept JPG/PNG/WEBP up to 5 MB and validate image signatures. The optional digital-file API accepts ZIP/PDF/FIG/TXT/CSV/JSON/XLSX/DOCX/PPTX up to `CLOUDINARY_MAX_FILE_MB` (10 MB by default). The product editor continues to use manual product delivery after payment approval.

Customers can search/filter/sort the catalogue, save/remove wishlist items, add to cart or buy one product directly, create an order with server-confirmed pricing, submit payment evidence, and resubmit after rejection. Pending payments block duplicate evidence submissions. The seller delivers products manually after payment approval; approved purchases show delivery guidance and a support link. Payment approval does not record delivery completion. Purchase history retains the original item title/price after catalogue edits. Verified buyers can write/update one review per product. Notifications support read/unread state and a mark-all-read action. Account names can be edited through Better Auth.

`NEXT_PUBLIC_MARKETPLACE_CURRENCY` controls the single store currency and defaults to **USD**, matching the original prices. Changing it does not convert existing amounts. Configure it before entering prices, and review existing order amounts before changing an established store's currency.

Local integration validation can use PGlite through the PostgreSQL wire protocol, but deployment should be rehearsed with the actual hosted PostgreSQL and Cloudinary services. No real financial transfers are performed by this app; payment review is manual.
