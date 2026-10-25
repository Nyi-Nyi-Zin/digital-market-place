import { headers } from "next/headers";
import { getAuth } from "./auth";
import { ensureMarketplaceUser } from "./db";
import { isTelegramOAuthEnabled } from "./oauth";

export async function telegramConnection() {
  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const accounts = session
    ? await auth.api.listUserAccounts({ headers: requestHeaders })
    : [];
  return {
    enabled: isTelegramOAuthEnabled(),
    linked: accounts.some(account => account.providerId === "telegram"),
    emailVerified: session?.user.emailVerified ?? false,
  };
}
export async function currentUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session ? ensureMarketplaceUser(session.user) : undefined;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Response("Authentication required", { status: 401 });
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin")
    throw new Response("Administrator access required", { status: 403 });
  return user;
}
export async function notificationIdentity(audience: "customer" | "admin") {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) throw new Response("Authentication required", { status: 401 });
  const user = await ensureMarketplaceUser(session.user);
  if (audience === "admin" && user.role !== "admin")
    throw new Response("Administrator access required", { status: 403 });
  return { user, sessionId: session.session.id };
}
