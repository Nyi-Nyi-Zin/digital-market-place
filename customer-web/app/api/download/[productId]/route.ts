import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { assertApprovedDownload } from "@marketplace/server/validation";
import {
  getApprovedOrderForProduct,
  getDb,
  isApprovedOwner,
  products,
  recordDownload,
} from "@marketplace/server/db";
import { storageGetSignedUrl } from "@marketplace/server/storage";
import { requireUser } from "@marketplace/server/next-auth";
import { HttpError } from "@marketplace/server/http";

export const dynamic = "force-dynamic";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const user = await requireUser();
    const productId = Number((await params).productId);
    assertApprovedDownload(await isApprovedOwner(user.id, productId));
    const db = getDb();
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product?.digitalFileKey)
      return new NextResponse("Digital file unavailable", {
        status: 404,
        headers,
      });
    const url = await storageGetSignedUrl(product.digitalFileKey);
    const order = await getApprovedOrderForProduct(user.id, productId);
    await recordDownload(user.id, productId, order!.id);
    return NextResponse.json({ url }, { headers });
  } catch (error) {
    const status =
      error instanceof Response || error instanceof HttpError
        ? error.status
        : 403;
    const message =
      error instanceof Error ? error.message : "Payment approval required";
    return new NextResponse(message, { status, headers });
  }
}
