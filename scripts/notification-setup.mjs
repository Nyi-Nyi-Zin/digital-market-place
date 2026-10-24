import fs from "node:fs";
import path from "node:path";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));
const filename = path.join(root, ".env");
const require = createRequire(
  new URL("../packages/server/package.json", import.meta.url)
);
const { generateVAPIDKeys } = require("web-push");
const args = process.argv.slice(2);
function argument(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error(`A value is required for ${name}`);
  return args[index + 1];
}
function validateSubject(value) {
  const url = new URL(value);
  if (
    !(
      (url.protocol === "https:" &&
        url.hostname &&
        !url.username &&
        !url.password) ||
      (url.protocol === "mailto:" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname))
    )
  ) {
    throw new Error("VAPID contact must be a real HTTPS URL or mailto address");
  }
  return value;
}
try {
  if (!fs.existsSync(filename))
    throw new Error(
      "Create .env from .env.example before running notification setup"
    );
  if (fs.lstatSync(filename).isSymbolicLink())
    throw new Error("Refusing to replace a linked .env file");
  let contents = fs.readFileSync(filename, "utf8");
  const env = parse(contents);
  const updates = new Map();
  const publicKey = env.VAPID_PUBLIC_KEY?.trim(),
    privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey && !privateKey) {
    const keys = generateVAPIDKeys();
    updates.set("VAPID_PUBLIC_KEY", keys.publicKey);
    updates.set("VAPID_PRIVATE_KEY", keys.privateKey);
  } else {
    if (!privateKey)
      throw new Error(
        "An existing VAPID public key has no private key. Existing keys were preserved; do not rotate keys for subscribed devices unintentionally."
      );
    const curve = createECDH("prime256v1");
    curve.setPrivateKey(Buffer.from(privateKey, "base64url"));
    const derived = curve.getPublicKey().toString("base64url");
    if (publicKey && publicKey !== derived)
      throw new Error("Existing VAPID keys do not match. They were preserved.");
    if (!publicKey) updates.set("VAPID_PUBLIC_KEY", derived);
  }
  if (!env.NOTIFICATION_WORKER_SECRET)
    updates.set(
      "NOTIFICATION_WORKER_SECRET",
      randomBytes(48).toString("base64url")
    );
  else if (env.NOTIFICATION_WORKER_SECRET.length < 32)
    throw new Error(
      "The existing worker secret is too short; replace it with at least 32 random characters"
    );
  const subject = argument("--subject") ?? env.VAPID_SUBJECT;
  if (subject) updates.set("VAPID_SUBJECT", validateSubject(subject));
  const from = argument("--from") ?? env.MAIL_FROM;
  if (from) {
    if (
      /[\r\n]/.test(from) ||
      !/^[^<>\r\n]*<?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(from)
    )
      throw new Error(
        "Supply a valid sender address using your verified domain"
      );
    updates.set("MAIL_FROM", from);
  }
  const resend = args.includes("--resend") || Boolean(env.RESEND_API_KEY);
  if (resend) {
    if (env.SMTP_HOST && env.SMTP_HOST !== "smtp.resend.com")
      throw new Error(
        "An SMTP provider is already configured; existing settings were preserved"
      );
    if (!env.SMTP_PORT) updates.set("SMTP_PORT", "465");
    if (!env.SMTP_USER) updates.set("SMTP_USER", "resend");
    const key =
      env.RESEND_API_KEY?.trim() ||
      (env.SMTP_HOST === "smtp.resend.com"
        ? env.SMTP_PASSWORD?.trim()
        : undefined);
    if (key) {
      if (!key.startsWith("re_") || /\s/.test(key))
        throw new Error("RESEND_API_KEY is not a valid Resend key");
      if (!from)
        throw new Error(
          "Supply --from with an address at your verified domain"
        );
      updates.set("SMTP_HOST", "smtp.resend.com");
      updates.set("SMTP_PASSWORD", key);
    } else if (!("RESEND_API_KEY" in env)) updates.set("RESEND_API_KEY", "");
  }
  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  for (const [key, value] of updates) {
    if (env[key] === value) continue;
    const serialized = JSON.stringify(value);
    const line = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, "gm");
    if (line.test(contents))
      contents = contents.replace(line, () => `${key}=${serialized}`);
    else
      contents += `${contents.endsWith("\n") ? "" : newline}${key}=${serialized}${newline}`;
  }
  if (contents !== fs.readFileSync(filename, "utf8")) {
    const temp = path.join(root, "tmp", `notification-env-${randomUUID()}.tmp`);
    fs.mkdirSync(path.dirname(temp), { recursive: true });
    try {
      fs.writeFileSync(temp, contents, { flag: "wx", mode: 0o600 });
      fs.renameSync(temp, filename);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }
  console.log(
    "Notification secrets saved in local .env; existing key pairs and unrelated settings preserved. Secret values are not printed."
  );
  console.log(
    subject
      ? "Web Push contact configured."
      : "Web Push still needs VAPID_SUBJECT: rerun with --subject https://your-domain.com"
  );
  if (resend)
    console.log(
      (updates.get("SMTP_PASSWORD") || env.SMTP_PASSWORD) &&
        (updates.get("SMTP_HOST") || env.SMTP_HOST)
        ? "Resend SMTP configured. Verify your sending domain, then run pnpm notifications:doctor --verify-smtp."
        : "Resend email staged but inactive. Verify your domain in Resend, save RESEND_API_KEY in .env, then rerun pnpm notifications:setup --resend."
    );
} catch (error) {
  console.error(
    "Notification setup:",
    error instanceof Error ? error.message : "Unable to configure notifications"
  );
  process.exitCode = 1;
}
