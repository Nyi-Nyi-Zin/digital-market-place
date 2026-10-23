import { NextResponse } from "next/server";
import { getPaymentMethods } from "@marketplace/server/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const methods = await getPaymentMethods();
  return NextResponse.json({ methods });
}
