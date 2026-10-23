import { NextResponse } from "next/server";
import { requireAdmin } from "@marketplace/server/next-auth";
import { adminOverview } from "@marketplace/server/marketplace";
import { fail } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await adminOverview());
  } catch (error) {
    return fail(error);
  }
}
