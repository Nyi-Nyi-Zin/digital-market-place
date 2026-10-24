import { NextResponse } from "next/server";
import {
  processNotificationBatch,
  workerAuthorized,
} from "@marketplace/server/notification-worker";
import { fail } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!workerAuthorized(request.headers.get("authorization")))
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  try {
    return NextResponse.json(await processNotificationBatch(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}
// Supports schedulers that issue authenticated GET requests.
export const GET = POST;
