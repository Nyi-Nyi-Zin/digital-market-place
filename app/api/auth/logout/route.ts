import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../../shared/const";
export async function POST(request: Request) { const response = NextResponse.redirect(new URL("/", request.url), { status: 303 }); response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 }); return response; }
