import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, encodeOAuthState } from "../../../../shared/const";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const nonce = crypto.randomUUID();
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/callback`;
  const state = encodeOAuthState({ redirectUri, nonce });
  const portalUrl = process.env.VITE_OAUTH_PORTAL_URL;
  const appId = process.env.VITE_APP_ID;
  if (!portalUrl || !appId) return new NextResponse("OAuth configuration is unavailable", { status: 503 });
  const target = new URL("/app-auth", portalUrl);
  target.searchParams.set("appId", appId);
  target.searchParams.set("redirectUri", redirectUri);
  target.searchParams.set("state", state);
  target.searchParams.set("type", "signIn");
  const response = NextResponse.redirect(target);
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return response;
}
