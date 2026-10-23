import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./database";
import {
  products,
  categories,
  orders,
  orderItems,
  payments,
  paymentMethods,
  users,
  notifications,
  reviews,
} from "./schema";
import { HttpError } from "./http";
import { evidenceInput } from "@marketplace/shared/marketplace-validation";
import { validateImageBytes } from "./validation";
import { storagePut } from "./storage";

export async function adminOverview() {
  const db = getDb();
  const [catalog, groups, orderRows, itemRows, paymentRows, methods, stats] =
    await Promise.all([
      db.select().from(products).orderBy(desc(products.createdAt)),
      db.select().from(categories).orderBy(categories.name),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
      db.select().from(payments).orderBy(desc(payments.createdAt)),
      db.select().from(paymentMethods).orderBy(paymentMethods.name),
      db
        .select({
          revenue: sql<string>`coalesce(sum(${orders.total}) filter(where ${orders.paymentStatus} = 'approved'),0)`,
          approved: sql<number>`count(*) filter(where ${orders.paymentStatus}='approved')::int`,
        })
        .from(orders),
    ]);
  return {
    products: catalog,
    categories: groups,
    orders: orderRows.map(order => ({
      ...order,
      items: itemRows.filter(item => item.orderId === order.id),
    })),
    payments: paymentRows,
    methods,
    stats: {
      revenue: Number(stats[0].revenue),
      approvedOrders: stats[0].approved,
      pendingPayments: paymentRows.filter(p => p.status === "pending").length,
      products: catalog.length,
    },
  };
}
export type AdminOverview = Awaited<ReturnType<typeof adminOverview>>;
export async function submitEvidence(userId: number, raw: unknown) {
  const input = evidenceInput.parse(raw);
  const db = getDb();
  const bytes = Buffer.from(
    input.screenshotData.replace(/^data:[^;]+;base64,/, ""),
    "base64"
  );
  try {
    validateImageBytes(input.screenshotContentType, bytes);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
  // Check ownership before storing any evidence.
  const [owned] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)));
  if (!owned) throw new HttpError(404, "Order not found");
  if (owned.paymentStatus === "approved")
    throw new HttpError(409, "This order is already approved");
  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.name, input.paymentMethod),
        eq(paymentMethods.enabled, true)
      )
    );
  if (!method) throw new HttpError(400, "That payment method is unavailable");
  const stored = await storagePut(
    `payment-screenshots/${userId}/${input.orderId}.${input.screenshotContentType.split("/")[1]}`,
    bytes,
    input.screenshotContentType
  );
  return db.transaction(async tx => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (order.paymentStatus === "approved")
      throw new HttpError(409, "This order is already approved");
    const pending = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(eq(payments.orderId, order.id), eq(payments.status, "pending"))
      );
    if (pending.length)
      throw new HttpError(409, "Payment evidence is already awaiting review");
    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        userId,
        paymentMethod: method.name,
        amount: order.total,
        senderName: input.senderName,
        senderPhone: input.senderPhone,
        transactionReference: input.transactionReference,
        screenshotKey: stored.key,
      })
      .returning();
    await tx
      .update(orders)
      .set({ paymentStatus: "pending", orderStatus: "payment_pending" })
      .where(eq(orders.id, order.id));
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    await tx.insert(notifications).values([
      {
        userId,
        title: "Payment submitted",
        body: `Order #${order.id} is awaiting review.`,
        kind: "payment_submitted",
      },
      ...admins.map(admin => ({
        userId: admin.id,
        title: "New payment evidence",
        body: `Review payment #${payment.id} for order #${order.id}.`,
        kind: "payment_submitted",
      })),
    ]);
    return { paymentId: payment.id, status: "pending" };
  });
}
export async function listPublicReviews(productId: number) {
  return getDb()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
      name: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
}
export async function writeReview(
  userId: number,
  productId: number,
  rating: number,
  body: string
) {
  return getDb().transaction(async tx => {
    await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .for("update");
    const owned = await tx
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orderItems.productId, productId),
          eq(orders.paymentStatus, "approved")
        )
      )
      .limit(1);
    if (!owned[0])
      throw new HttpError(403, "Only verified buyers can review this product");
    const existing = await tx
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId)))
      .limit(1);
    if (existing.length)
      await tx
        .update(reviews)
        .set({ rating, body })
        .where(eq(reviews.id, existing[0].id));
    else
      await tx
        .insert(reviews)
        .values({ userId, productId, orderId: owned[0].id, rating, body });
    const [average] = await tx
      .select({ rating: sql<string>`round(avg(${reviews.rating}),2)` })
      .from(reviews)
      .where(eq(reviews.productId, productId));
    await tx
      .update(products)
      .set({ rating: average.rating })
      .where(eq(products.id, productId));
    return { success: true };
  });
}
