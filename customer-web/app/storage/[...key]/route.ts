import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  getDb,
  isApprovedOwner,
  products,
  payments,
} from "@marketplace/server/db";
import {
  parseStorageKey,
  storageGetSignedUrl,
} from "@marketplace/server/storage";
import { HttpError } from "@marketplace/server/http";
import { requireUser } from "@marketplace/server/next-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const key = (await params).key.join("/");
    const asset = parseStorageKey(key);
    const db = getDb();
    let publicThumbnail = false;
    if (asset.deliveryType === "upload") {
      const thumbnail = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.thumbnailKey, key))
        .limit(1);
      publicThumbnail = Boolean(thumbnail.length);
    }
    if (!publicThumbnail) {
      const user = await requireUser();
      if (user.role !== "admin") {
        const [product] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.digitalFileKey, key))
          .limit(1);
        const [screenshot] = await db
          .select({ userId: payments.userId })
          .from(payments)
          .where(eq(payments.screenshotKey, key))
          .limit(1);
        const allowed = product
          ? await isApprovedOwner(user.id, product.id)
          : screenshot?.userId === user.id;
        if (!allowed)
          return new NextResponse("File access denied", {
            status: 403,
            headers: privateHeaders,
          });
      }
    }
    return NextResponse.redirect(await storageGetSignedUrl(key), {
      status: 307,
      headers: privateHeaders,
    });
  } catch (error) {
    const status =
      error instanceof Response || error instanceof HttpError
        ? error.status
        : 503;
    return new NextResponse(
      status === 401 ? "Authentication required" : "File unavailable",
      {
        status,
        headers: privateHeaders,
      }
    );
  }
}
