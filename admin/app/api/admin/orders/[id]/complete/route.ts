import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@marketplace/server/next-auth";
import { completeOrder } from "@marketplace/server/notifications";
import { fail, HttpError } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const expected = new URL(
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"
    ).origin;
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (request.headers.get("origin") &&
        request.headers.get("origin") !== expected)
    )
      throw new HttpError(403, "Invalid request origin");
    const admin = await requireAdmin();
    const id = z.coerce
      .number()
      .int()
      .positive()
      .parse((await context.params).id);
    return NextResponse.json(
      { order: await completeOrder(id, admin.id) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return fail(error);
  }
}
