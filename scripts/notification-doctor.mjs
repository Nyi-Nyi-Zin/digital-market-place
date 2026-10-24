import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createECDH } from "node:crypto";
import pg from "pg";

config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
const require = createRequire(
  new URL("../packages/server/package.json", import.meta.url)
);
const { createTransport } = require("nodemailer");
const env = process.env;
let keysMatch = false;
try {
  const curve = createECDH("prime256v1");
  curve.setPrivateKey(Buffer.from(env.VAPID_PRIVATE_KEY ?? "", "base64url"));
  keysMatch =
    curve.getPublicKey().toString("base64url") === env.VAPID_PUBLIC_KEY;
} catch {}
console.log("Notification configuration", {
  vapidKeyPair: keysMatch,
  vapidContact: Boolean(env.VAPID_SUBJECT),
  workerSecret: Boolean(
    env.NOTIFICATION_WORKER_SECRET &&
      env.NOTIFICATION_WORKER_SECRET.length >= 32
  ),
  emailConfigured: Boolean(
    env.SMTP_HOST && env.MAIL_FROM && (!env.SMTP_USER || env.SMTP_PASSWORD)
  ),
  customerOrigin: env.NEXT_PUBLIC_CUSTOMER_URL ?? "http://localhost:3000",
  adminOrigin: env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
});
if (!env.SMTP_HOST)
  console.log(
    "Email is inactive: supply the email provider credentials after verifying your sending domain."
  );
const db = new pg.Client({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  await db.connect();
  const tables = (
    await db.query(
      "select table_name from information_schema.tables where table_schema='public' and table_name in ('notifications','notification_preferences','push_subscriptions','notification_deliveries') order by table_name"
    )
  ).rows;
  console.log("Notification database", {
    ready: tables.length === 4,
    tables: tables.map(row => row.table_name),
  });
  if (tables.length !== 4) {
    process.exitCode = 1;
    console.log("Apply pnpm db:migrate before starting the worker.");
  } else
    console.log(
      "Delivery queue",
      (
        await db.query(
          "select status,count(*)::int as count from notification_deliveries group by status order by status"
        )
      ).rows
    );
} catch (error) {
  console.error(
    "Notification database unavailable",
    error?.code ?? "connection failed"
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
if (process.argv.includes("--verify-smtp")) {
  if (
    !env.SMTP_HOST ||
    !env.MAIL_FROM ||
    (env.SMTP_USER && !env.SMTP_PASSWORD)
  ) {
    console.error(
      "SMTP verification requires the provider credentials and MAIL_FROM. No test email was sent."
    );
    process.exitCode = 1;
  } else {
    const mailer = createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? 587),
      secure: env.SMTP_PORT === "465",
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    try {
      await mailer.verify();
      console.log(
        "SMTP connection and authentication verified. No email was sent; domain verification and inbox delivery need separate checks."
      );
    } catch (error) {
      console.error(
        "SMTP verification failed",
        error?.code ?? "connection/authentication failure"
      );
      process.exitCode = 1;
    } finally {
      mailer.close();
    }
  }
}
