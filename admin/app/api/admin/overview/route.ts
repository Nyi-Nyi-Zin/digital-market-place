import { NextResponse } from "next/server";
import { requireAdmin } from "@marketplace/server/next-auth";
import { adminOverview } from "@marketplace/server/marketplace";
import { fail } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    return NextResponse.json(
      await adminOverview(Object.fromEntries(new URL(request.url).searchParams))
    );
  } catch (error) {
    return fail(error);
  }
}
