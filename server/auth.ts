import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { createTransport } from "nodemailer";
import * as schema from "../drizzle/schema";
import { getDb } from "./database";

export function createAuth(
  database: NodePgDatabase<typeof schema>,
  env = process.env
) {
  const production = env.NODE_ENV === "production";
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set BETTER_AUTH_SECRET to at least 32 random characters");
  if (!env.BETTER_AUTH_URL)
    throw new Error("Set BETTER_AUTH_URL to the application origin");
  const mailEnabled = Boolean(env.SMTP_HOST && env.MAIL_FROM);
  if (production && !mailEnabled)
    throw new Error(
      "Production authentication requires SMTP_HOST and MAIL_FROM for verified sign-up and password recovery"
    );
  const mailer = mailEnabled
    ? createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? 587),
        secure: env.SMTP_PORT === "465",
        auth: env.SMTP_USER
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
      })
    : null;
  const send = async (to: string, subject: string, url: string) => {
    if (!mailer) throw new Error("Email delivery is not configured");
    await mailer.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text: `${subject}\n\n${url}\n\nIf you did not request this, ignore this email.`,
    });
  };
  return betterAuth({
    appName: "Cloud Nine",
    secret,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
    database: drizzleAdapter(database, {
      provider: "pg",
      transaction: true,
      schema: {
        user: schema.authUsers,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
        rateLimit: schema.authRateLimits,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: mailEnabled,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        send(user.email, "Reset your Cloud Nine password", url),
    },
    emailVerification: {
      sendOnSignUp: mailEnabled,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        send(user.email, "Verify your Cloud Nine email", url),
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    plugins: [nextCookies()],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth(getDb()));
}
