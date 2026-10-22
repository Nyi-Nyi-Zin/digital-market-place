# Cloud Nine digital marketplace

Next.js App Router + PostgreSQL + Drizzle ORM + Better Auth.

## Local setup

Use Node.js 22 or newer and the package manager pinned in `package.json`.

1. Copy `.env.example` to `.env` and set a random `BETTER_AUTH_SECRET` (at least 32 characters).
2. Start PostgreSQL, for example `POSTGRES_PASSWORD=<local-password> docker compose up -d`.
3. Set `DATABASE_URL` to that PostgreSQL database and `BETTER_AUTH_URL` to `http://localhost:3000`.
4. Run `pnpm install --frozen-lockfile`, then `pnpm db:migrate` and `pnpm dev`.
5. Open `/sign-up`. Configure SMTP to test email verification and recovery.

Next.js reads `.env` automatically. CLI scripts import `dotenv/config` and use the same file. The PostgreSQL example password is for local development only.

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

The existing Forge/S3 storage configuration is separate from auth and is still needed for hosted product files and the logo. The rest of the admin/checkout integration backlog remains separate from this database/auth migration.
