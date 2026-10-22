import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { adminOverview } from "../../../../server/marketplace";
import { fail } from "../../../../server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await adminOverview());
  } catch (error) {
    return fail(error);
  }
}
