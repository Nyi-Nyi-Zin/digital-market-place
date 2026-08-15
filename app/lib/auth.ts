import { cookies } from "next/headers";
import { COOKIE_NAME } from "../../shared/const";
import { sdk } from "../../server/_core/sdk";
import { getUserByOpenId } from "../../server/db";

export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await sdk.verifySession(token);
  return session ? getUserByOpenId(session.openId) : undefined;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Response("Authentication required", { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Response("Administrator access required", { status: 403 });
  return user;
}
