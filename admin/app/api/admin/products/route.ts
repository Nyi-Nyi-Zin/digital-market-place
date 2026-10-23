import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@marketplace/server/next-auth";
import {
  getDb,
  products,
  orders,
  orderItems,
  notifications,
} from "@marketplace/server/db";
import {
  productInput,
  checkProduct,
} from "@marketplace/shared/marketplace-validation";
import { fail, readJson, HttpError } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      products: await getDb().select().from(products),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = checkProduct(productInput.parse(await readJson(request)));
    const [product] = await getDb().insert(products).values(input).returning();
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const raw = await readJson(request);
    const id = Number(raw.id);
    const db = getDb();
    const [old] = await db.select().from(products).where(eq(products.id, id));
    if (!old) throw new HttpError(404, "Product not found");
    const input = checkProduct(productInput.parse({ ...old, ...raw }));
    const [product] = await db
      .update(products)
      .set(input)
      .where(eq(products.id, id))
      .returning();
    const buyers = await db
      .selectDistinct({ userId: orders.userId })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(eq(orderItems.productId, id), eq(orders.paymentStatus, "approved"))
      );
    if (buyers.length)
      await db.insert(notifications).values(
        buyers.map(buyer => ({
          userId: buyer.userId,
          title: "Product updated",
          body: `${product.title} has been updated.`,
          kind: "product_updated",
        }))
      );
    return NextResponse.json({ product });
  } catch (e) {
    return fail(e);
  }
}
// Keep historical orders and downloads intact: removal unpublishes the product.
export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1)
      throw new HttpError(400, "Invalid product");
    const [product] = await getDb()
      .update(products)
      .set({ status: "draft", featured: false })
      .where(eq(products.id, id))
      .returning();
    if (!product) throw new HttpError(404, "Product not found");
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}
