import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, OAUTH_STATE_COOKIE, ONE_YEAR_MS, decodeOAuthState } from "../../../../shared/const";
import { sdk } from "../../../../server/_core/sdk";
import { upsertUser } from "../../../../server/db";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
  if (!code || !state) return new NextResponse("OAuth code and state are required", { status: 400 });
  const expectedNonce = (await cookies()).get(OAUTH_STATE_COOKIE)?.value;
  const { nonce } = decodeOAuthState(state);
  if (!nonce || nonce !== expectedNonce) return new NextResponse("Invalid OAuth state", { status: 403 });
  try { const token = await sdk.exchangeCodeForToken(code, state); const userInfo = await sdk.getUserInfo(token.accessToken); if (!userInfo.openId) return new NextResponse("OAuth user identity is unavailable", { status: 400 }); await upsertUser({ openId: userInfo.openId, name: userInfo.name || null, email: userInfo.email ?? null, loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null, lastSignedIn: new Date() }); const sessionToken = await sdk.createSessionToken(userInfo.openId, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS }); const response = NextResponse.redirect(new URL("/account", request.url)); response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 }); response.cookies.set(COOKIE_NAME, sessionToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(ONE_YEAR_MS / 1000) }); return response; } catch { return new NextResponse("OAuth callback failed", { status: 500 }); }
}
