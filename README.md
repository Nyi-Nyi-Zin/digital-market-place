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

Run `pnpm install --frozen-lockfile`, then `pnpm dev` for both sites and the notification worker. Use `pnpm dev:customer` / `pnpm dev:admin`, or `pnpm --filter @marketplace/customer dev` / `pnpm --filter @marketplace/admin dev`, to run one site; those individual commands do not start the worker. The same filters support `check`, `build` and `start`. Stop an older preview using ports 3000/3001 before launching these apps.

Launchers load the root `.env` without overriding provided environment variables. Development outputs are `customer-web/.next-dev` and `admin/.next-dev`; production outputs are each app's `.next`. Each deployment receives its own server environment, while database/storage settings point to the shared services. Set `NEXT_PUBLIC_CUSTOMER_URL` and `NEXT_PUBLIC_ADMIN_URL` to different origins and rebuild after changing them. Each site's `BETTER_AUTH_URL` is derived from its own origin.

Customer admin APIs and admin shopping routes are absent. Customer `/admin/*` redirects to the matching admin URL, preserving queries. Admin has no public sign-up; create a customer identity, verify it, and grant the administrator role using the trusted CLI. Admin role checks and separate host-only auth cookies remain enforced; signing out of one site preserves the other session.

### Google and Telegram OAuth sign-in

Both sign-in pages and customer sign-up support **Continue with Google** through Better Auth's [Google provider](https://better-auth.com/docs/authentication/google). Create a Web application OAuth client in [Google Auth Platform](https://console.cloud.google.com/auth/clients), configure the consent screen and test users if the app is in testing, and register these exact authorized redirect URIs for local development:

- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google`

Add the corresponding HTTPS callback URLs for both production domains. Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the ignored root `.env` and each deployment's server environment, then restart the sites. Never use `NEXT_PUBLIC_` for these credentials. Both sites may share a web client with both callbacks registered, or use complete `CUSTOMER_GOOGLE_CLIENT_ID` / `CUSTOMER_GOOGLE_CLIENT_SECRET` and `ADMIN_GOOGLE_CLIENT_ID` / `ADMIN_GOOGLE_CLIENT_SECRET` pairs. The button stays disabled when its site's credentials are missing. No schema migration is required.

Customer Google OAuth can create an ordinary account. Admin OAuth disables registration, including explicit signup requests; use an existing verified account with an administrator role granted by `pnpm admin:grant -- email@example.com`. A verified Google email can link to an existing **verified** account with the same email, preserving its orders and role. Unverified existing accounts must verify their local email first or continue using their password. OAuth never grants administrator access. Each app keeps its own host-only session cookies and safe `next` destination; canceled/failed sign-in returns to the originating sign-in page with a translated error.

For **Telegram**, follow the [official Telegram OpenID Connect setup](https://core.telegram.org/bots/telegram-login): select your application bot in BotFather's mini app, open **Login Widget**, register both site origins plus `http://localhost:3000/api/auth/callback/telegram` and `http://localhost:3001/api/auth/callback/telegram` (and your production HTTPS equivalents), and save the issued `TELEGRAM_CLIENT_ID` / `TELEGRAM_CLIENT_SECRET` in the ignored root `.env` and deployment environments. These are OIDC credentials, not a Bot API token. Optional complete `CUSTOMER_TELEGRAM_*` / `ADMIN_TELEGRAM_*` pairs override the shared credentials. Restart both sites after configuring them.

Telegram supplies no email. Users first sign in using email/password or Google, open **Account**, and choose **Connect Telegram** with a verified account email. Thereafter **Continue with Telegram** signs into that same identity on either site (admin access still requires its existing role). No Telegram registration or fabricated email is used, and usernames/phone numbers never choose a local identity. Linking uses Better Auth's authenticated OAuth state; Telegram's signed OIDC subject is the account key. Discovery must provide issuer/JWKS metadata; the library verifies token signature, issuer, audience, expiry and nonce before mapping claims. Requests use PKCE and only `openid profile` scopes. A Telegram identity already attached to someone else cannot be reassigned. No migration is required.

### Independent production artifacts

`pnpm build:customer` and `pnpm build:admin` each create Next.js standalone output. On Windows, the build launcher uses directory junctions for Next 15's pnpm links so the build needs no symlink privilege. On deployment platforms, use the native standalone output and copy that app's `public` and `.next/static` directories as described in the Next.js standalone documentation.

For a local artifact with traced runtime packages materialized and no links back to workspace `node_modules`, run `pnpm package:customer` or `pnpm package:admin` after building. The command prints a fresh `dist/<app>-<timestamp>/` directory and its server entrypoint. It includes only traced runtime packages and fails explicitly if traced versions cannot be flattened safely. Provide the deployment's server environment and `PORT` when starting the printed entrypoint. Artifacts include platform-specific dependencies; build/package on the target operating system.

`pnpm check` verifies both apps, shared code and import/dependency boundaries. Current regression tests live in `tests/`; `pnpm test:integration` runs them against a newly created disposable local PostgreSQL database and removes it afterward. Obsolete Vite/tRPC source, compatibility facades and template configuration have been removed. Database migration history and the explicit MySQL import/identity recovery tools are retained.

## UI components and notifications

Both sites use local shadcn/ui components: `admin/components/ui` and `customer-web/app/components/ui`. Each app has its own `components.json`, Tailwind v4/PostCSS setup, and `cn` utility. Add components from the relevant app directory with `pnpm dlx shadcn@latest add <component>`. Component source follows the official `new-york-v4` registry and is owned by this repository.

Use these components for buttons, inputs, textareas, selects, and dialogs. Existing Cloud Nine button classes use `variant="brand" size="brand"`; standard shadcn variants remain available for new controls. `DialogContent` supports `branded` and `overlayClassName` for the existing modals and mobile drawer. Tailwind utilities load without Preflight to preserve the established base styles and both themes.

Use Sonner's `toast.success`, `toast.error`, or `toast.info` for action notifications. Each app mounts one theme-aware, translated shadcn `Toaster` in its providers. The mutation cache reports API mutation failures centrally; use the `operation-error` toast ID when a form also handles the same failure. Keep persistent loading, empty, and page-fetch error states inline. Destructive decisions use shadcn `AlertDialog`; admin `ConfirmAction` preserves the dialog on failure and closes after success. Add new UI messages to all five shared locale dictionaries.

## Persistent admin/customer notifications

Notifications, channel preferences, browser subscriptions and delivery jobs live in the **same PostgreSQL database** as orders. Admin and customer inboxes are separated by audience, even when the same identity uses both sites. Each admin has an independent read state. Notification history persists across devices; React Query is only a temporary UI cache.

Order creation, payment submission/resubmission, review and manual delivery completion create inbox records and delivery jobs in the same transaction. Approval marks an order `paid`; an administrator must confirm **Mark as delivered** to mark it `completed`. The order stores the completing admin and time. Repeat/concurrent confirmations do not create duplicate events. The acting reviewer/completer gets a toast rather than another admin notification.

Customer history is at `/account/notifications`; admin history and failed delivery management are at `/notifications`. Bells preview five messages; full lists contain 20 per page with All/Unread and individual/all read actions. Foreground polling and window-focus refresh keep counts current. Email is enabled by default and can be disabled per audience; website history is always enabled. External templates support all five languages, using the saved site language when the job is created. Existing legacy history and read flags are retained; migration does not replay old messages.

#### Configure email and browser push

`pnpm notifications:setup --subject https://your-domain.com` generates missing Web Push keys and a worker secret directly in the ignored local `.env`. It preserves existing matching key pairs, existing secrets and unrelated configuration, and prints no secret values. It refuses to overwrite incomplete/mismatched existing keys. `pnpm notifications:doctor` checks the key pair, configuration, migration tables and delivery queue without sending messages. `pnpm dev` starts the delivery worker automatically with both local sites.

For **Resend**, create a free account and add a sending subdomain such as `notify.your-domain.com` in [Domains](https://resend.com/domains). Add the exact DNS records Resend generates at your domain's authoritative DNS provider, and wait for Resend to show the sending domain as verified. Existing website/DNS records do not need to be replaced. Create a sending API key and store it only in your local `.env` as `RESEND_API_KEY`; never paste it into chat or commit it. Then run:

```bash
pnpm notifications:setup --resend --from "Cloud Nine <notifications@notify.your-domain.com>" --subject https://your-domain.com
pnpm notifications:doctor --verify-smtp
```

The setup helper maps the Resend key to the existing SMTP configuration (`smtp.resend.com`, username `resend`, TLS port 465 unless a port is already configured). Running it before a key exists stages the sender without enabling SMTP, preserving development sign-in while email setup is incomplete. SMTP verification checks connection/authentication only and does not send a test email or verify DNS. Restart the sites/worker after changing `.env`; their running processes do not automatically reload these credentials. Account creation, DNS verification, provider limits and API keys are managed in your own Resend account. Production deployments need their own server environment and scheduler/worker configuration.

1. Apply the reviewed migrations using `pnpm db:migrate` before starting the updated apps/workers. Migration `0002_notifications.sql` adds notification metadata, preferences, subscriptions, the queue and delivery completion fields. It identifies legacy admin payment-evidence messages by their original event/title and preserves all other history. Production migrations are explicit, never run during a build/start.
2. Set the existing `SMTP_*` and `MAIL_FROM` settings for the worker. Transactional emails are sent only to the **verified account email**, never an arbitrary checkout address. Verification/password-reset email behavior is unchanged. Configure your SMTP provider and sender domain; provider quotas/pricing are separate from this feature.
3. Run `pnpm notifications:setup --subject https://your-domain.com` to save missing `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `NOTIFICATION_WORKER_SECRET` directly in local `.env`. The contact can also be a real `mailto:...` address. Provide these settings securely in the server environments for both sites and the worker, keeping the key pair stable. Only the public key is returned to authenticated browser clients. Changing keys requires affected browsers to disable and re-enable push. Paid notification providers or Firebase are not required.
4. Set distinct, real HTTPS `NEXT_PUBLIC_CUSTOMER_URL` and `NEXT_PUBLIC_ADMIN_URL` values on both sites and the worker; rebuild the sites after changing their public URLs. Notification links use these configured origins. Set `NOTIFICATION_WORKER_SECRET` to at least 32 random characters on the admin deployment and scheduler.
5. Users enable push explicitly from Notification settings. Permission is requested only after their click. iPhone/iPad users must add the website to the Home Screen and open it there. Each site provides a manifest, PNG icons and a push-only service worker; it does **not cache authenticated pages or API responses**. Unsupported/blocked browsers keep website history and email.

Push payloads are generic and contain no customer name, email, amount, payment screenshot or rejection reason. Clicking opens a login-preserving route, then resolves the notification against the signed-in account before opening its order/payment. Subscriptions are tied to a marketplace user, audience and database auth session. Pending push jobs stop after logout/expiry, disabling the device or revoking admin access. Already delivered OS notifications cannot be recalled. Another account cannot take over an endpoint while its previous owner's session remains active. Subscription endpoints/keys are credentials and are not exposed in delivery logs. Only supported browser-provider HTTPS endpoints are accepted, with public-DNS validation before sending.

#### Run delivery processing

Choose **one primary runner** after deciding hosting:

- **Node/VPS/container:** run `pnpm notifications:worker` from a full workspace installation (including the root `tsx` tool) as a separate supervised process with the shared database, SMTP, VAPID and site URL environment. It checks for work every five seconds. `pnpm notifications:worker --once` processes one batch and exits; SIGINT/SIGTERM stop after the current batch. Standalone site artifacts can use the authenticated processing endpoint instead.
- **Serverless:** schedule an authenticated request every minute to the admin site's `/api/admin/notifications/process`. Both GET and POST accept `Authorization: Bearer <NOTIFICATION_WORKER_SECRET>`. Browser/admin sessions alone cannot invoke processing. The endpoint processes up to ten jobs with five-way concurrency and a two-minute recoverable lease. Ensure the hosting request duration supports the batch; monitor backlog and increase scheduler throughput or use a dedicated worker if needed. Scheduling is not installed automatically and may carry hosting costs.

Concurrent runners safely claim separate jobs using PostgreSQL `FOR UPDATE SKIP LOCKED`. Transient provider errors retry after 1 minute, 5 minutes, 15 minutes, 1 hour and 6 hours, for **six total attempts**. Permanent errors fail immediately; expired push endpoints are disabled. Unconfigured channels are marked blocked, checked again after five minutes, and consume no send attempts. Disabled preferences, unverified emails, revoked admin roles and inactive sessions are skipped rather than sent. Retry rechecks current recipient permissions/settings. Admins can inspect failed/blocked jobs and explicitly queue a retry from Notifications.

Queue processing provides **at-least-once external delivery**: a provider may accept a message just before the worker loses its connection or crashes. The inbox has unique event keys, push uses a stable notification tag and email uses a stable Message-ID, but email providers do not guarantee deduplication. Check queue backlog age, failed/blocked counts and runner logs after deployment. A SQL health check is `SELECT status, count(*), min("createdAt") FROM notification_deliveries GROUP BY status;`. Logs contain aggregate counts/sanitized failure categories, not subscription tokens or email contents. History/jobs are retained; no automatic deletion runs.

Notification APIs are private/no-store. Customer `/api/notifications` and admin `/api/admin/notifications` support `page`, `limit` (maximum 20), `filter=all|unread` and optional `id`; PATCH accepts `{id, read}` or `{all: true, throughId?}`. The original body-less customer PATCH remains mark-all-read. Each site also exposes its own authenticated `/api[/admin]/notification-preferences` and `/api[/admin]/push-subscriptions`. Admin-only `PATCH /api/admin/orders/:id/complete` completes a paid order. Admin-only `/api/admin/notification-deliveries` lists failed/blocked jobs and accepts PATCH `{id}` for retry. All recipient/audience values are derived server-side.

`pnpm test:integration` exercises notification transactions, audience/owner isolation, concurrency, migration preservation, preferences, localized email generation, mock delivery/retries, subscription ownership, expired sessions and role revocation against a disposable local PostgreSQL database. Real-device OS push delivery, SMTP inbox placement and production scheduling still require checks in the configured deployment.

## Store pages and operations

Customer information is available at `/how-to-buy`, `/about`, `/policies`, `/refund-policy`, `/terms`, `/privacy`, `/license` and `/faq`. Footer links make these pages discoverable. Admin **Content & store settings** (`/settings/store`) publishes plain-text page sections separately for each of the five languages, plus the support email, Telegram username and optional support hours. Default copy describes the current manual review/delivery process; configure your actual business policies and hours there. Concurrent edits use revision checks and return 409 instead of overwriting another administrator's work. Public pages load saved content on each request.

Customer `/account/purchases/:id` and admin `/orders/:id` show immutable item snapshots, totals, all payment attempts and delivery state. Administrators can review evidence, confirm delivery and add internal notes. Customer order APIs enforce ownership and exclude evidence storage keys, reviewer IDs and internal notes. Existing purchase/order lists retain their behavior and link to the detail pages.

Customer `/account/support` and admin `/support` provide paginated request lists and persistent conversations, optionally linked to a customer-owned order. Only administrators can close/reopen requests explicitly; replying reopens a closed request. Replies appear on the website with polling; support replies do not send email or browser push. Messages are rendered as plain text. Accounts may have up to 20 open requests.

Admin `/customers` provides searchable accounts and paginated purchase histories. `/reports` shows approved revenue, daily sales, the top 20 products and approved payment methods, with CSV export. Reports use **order creation dates** in Myanmar time (UTC+06:30), inclusive dates and a maximum 366-day range. Rejected/resubmitted payment attempts do not add revenue. Product line revenue is before order-level discounts. CSV cells neutralize spreadsheet formulas. `/activity` records new product/category/payment/settings/content/support/delivery actions with their administrator and timestamp; it does not reconstruct historic actions or store message bodies, notes, secrets or evidence URLs.

Apply migration `0003_store_support_operations.sql` using `pnpm db:migrate` before running these pages on an existing database. It adds store settings/content, support requests/messages, internal notes and activity history without rewriting orders or payments. All new private APIs authenticate per request, enforce administrator/owner boundaries and return `private, no-store`; new write endpoints reject cross-origin browser requests. Integration coverage runs in the disposable database created by `pnpm test:integration`.

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

The store supports **USD, SGD and MMK**. `NEXT_PUBLIC_MARKETPLACE_CURRENCY` is the base currency for product entry, filters in admin and financial reports; it defaults to **USD**. Do not change the base currency after entering prices or orders: changing this setting does not convert stored amounts.

Apply the PostgreSQL migrations before running the updated apps (`node -r dotenv/config node_modules/drizzle-kit/bin.cjs migrate`). In **Admin > Store settings > Exchange rates**, enter the number of SGD and MMK units per 1 USD and save. A blank rate disables that currency for new selections and orders; no market rates are fetched or assumed. In **Payment settings**, assign each enabled payment account its actual currency. Customers choose a currency in the header; product, discount and cart prices convert using the saved rates. Catalogue price filters use that selected currency and clear when it changes. Checkout only offers accounts matching the order currency.

The server confirms product prices and exchange rates at order creation, rounds each line (USD/SGD: two decimals; MMK: whole kyat), and sums those lines. The order stores the currency, exchange rate, converted item prices and payable total. Later rate changes do not change existing orders or payment resubmissions. Payment evidence stores the confirmed payable amount and currency alongside the original base amount. Admin revenue reports continue to sum base amounts so different currencies are never added together. Legacy orders and payment accounts retain USD with a rate of 1; their historical totals stay unchanged. If an established store previously used a different base currency, backfill its legacy currency columns to that original currency before serving the updated apps.

Local integration validation can use PGlite through the PostgreSQL wire protocol, but deployment should be rehearsed with the actual hosted PostgreSQL and Cloudinary services. No real financial transfers are performed by this app; payment review is manual.
