import { recordActivity } from "@marketplace/server/activity";
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
import { insertWithGeneratedSlug } from "@marketplace/server/slugs";
import { adminOverview } from "@marketplace/server/marketplace";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const data = await adminOverview({
      ...Object.fromEntries(new URL(request.url).searchParams),
      section: "products",
    });
    return NextResponse.json({
      products: data.products,
      pagination: data.pagination,
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    return await getDb().transaction(async tx => {
      const input = checkProduct(productInput.parse(await readJson(request)));
      const product = await insertWithGeneratedSlug(
        input.title,
        240,
        "product",
        async slug => {
          const [created] = await tx
            .insert(products)
            .values({ ...input, slug })
            .onConflictDoNothing({ target: products.slug })
            .returning();
          return created;
        }
      );
      await recordActivity(
        tx,
        actor.id,
        "Product created",
        `product:${product.id}`
      );
      return NextResponse.json({ product }, { status: 201 });
    });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireAdmin();
    return await getDb().transaction(async tx => {
      const raw = await readJson(request);
      const id = Number(raw.id);
      const db = tx;
      const [old] = await db.select().from(products).where(eq(products.id, id));
      if (!old) throw new HttpError(404, "Product not found");
      const input = checkProduct(productInput.parse({ ...old, ...raw }));
      const [product] = await db
        .update(products)
        .set({
          ...input,
          featured: input.status === "archived" ? false : input.featured,
        })
        .where(eq(products.id, id))
        .returning();
      const buyers = await db
        .selectDistinct({ userId: orders.userId })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, id),
            eq(orders.paymentStatus, "approved")
          )
        );
      if (buyers.length && product.status !== "archived")
        await db.insert(notifications).values(
          buyers.map(buyer => ({
            userId: buyer.userId,
            title: "Product updated",
            body: `${product.title} has been updated.`,
            kind: "product_updated",
          }))
        );
      await recordActivity(
        tx,
        actor.id,
        "Product updated",
        `product:${product.id}`
      );
      return NextResponse.json({ product });
    });
  } catch (e) {
    return fail(e);
  }
}
// Archive without deleting the product or its historical order references.
export async function DELETE(request: Request) {
  try {
    const actor = await requireAdmin();
    return await getDb().transaction(async tx => {
      const id = Number(new URL(request.url).searchParams.get("id"));
      if (!Number.isInteger(id) || id < 1)
        throw new HttpError(400, "Invalid product");
      const [product] = await tx
        .update(products)
        .set({ status: "archived", featured: false })
        .where(eq(products.id, id))
        .returning();
      if (!product) throw new HttpError(404, "Product not found");
      await recordActivity(
        tx,
        actor.id,
        "Product archived",
        `product:${product.id}`
      );
      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return fail(e);
  }
}
