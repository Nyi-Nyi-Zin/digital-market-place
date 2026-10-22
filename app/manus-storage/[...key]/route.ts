import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ENV } from "../../../server/_core/env";
import { getDb, isApprovedOwner, products, payments } from "../../../server/db";
import { requireUser } from "../../lib/auth";
export const dynamic = "force-dynamic";
const PUBLIC_LOGO = "cloud-nine-logo_7fdf2201.png";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const key = (await params).key.join("/");
  if (!key || !ENV.forgeApiUrl || !ENV.forgeApiKey)
    return new NextResponse("Storage is unavailable", { status: 503 });
  try {
    if (key !== PUBLIC_LOGO) {
      const db = getDb();
      const thumbnail = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.thumbnailKey, key))
        .limit(1);
      if (!thumbnail.length) {
        const user = await requireUser();
        const product = (
          await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.digitalFileKey, key))
            .limit(1)
        )[0];
        const screenshot = (
          await db
            .select({ userId: payments.userId })
            .from(payments)
            .where(eq(payments.screenshotKey, key))
            .limit(1)
        )[0];
        const allowed = product
          ? user.role === "admin" ||
            (await isApprovedOwner(user.id, product.id))
          : screenshot
            ? user.role === "admin" || screenshot.userId === user.id
            : false;
        if (!allowed)
          return new NextResponse("File access denied", { status: 403 });
      }
    }
    const forgeUrl = new URL(
      "v1/storage/presign/get",
      `${ENV.forgeApiUrl.replace(/\/+$/, "")}/`
    );
    forgeUrl.searchParams.set("path", key);
    const response = await fetch(forgeUrl, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    });
    if (!response.ok)
      return new NextResponse("Storage backend error", { status: 502 });
    const { url } = (await response.json()) as { url?: string };
    if (!url)
      return new NextResponse("Storage URL is unavailable", { status: 502 });
    return NextResponse.redirect(url, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Response
        ? "Authentication required"
        : "Storage unavailable",
      { status: error instanceof Response ? error.status : 503 }
    );
  }
}
