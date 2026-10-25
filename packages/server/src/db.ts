import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "./database";
import { emitOrderNotification } from "./notifications";
import {
  baseCurrency,
  currencyConfig,
  currencyInput,
  convertAmount,
  sumAmounts,
  type Currency,
} from "@marketplace/shared/currency";
export { getDb } from "./database";
import {
  InsertUser,
  users,
  categories,
  products,
  orders,
  orderItems,
  payments,
  paymentMethods,
  downloads,
  reviews,
  wishlists,
  notifications,
  activityLogs,
  storeSettings,
} from "./schema";

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return rows[0];
}
export async function listCategories() {
  const db = await getDb();
  return db ? db.select().from(categories).orderBy(categories.name) : [];
}
export async function listProducts(input?: {
  search?: string;
  categoryId?: number;
  featured?: boolean;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(products.status, "published")];
  if (input?.categoryId)
    conditions.push(eq(products.categoryId, input.categoryId));
  if (input?.featured) conditions.push(eq(products.featured, true));
  if (input?.search)
    conditions.push(
      or(
        like(products.title, `%${input.search}%`),
        like(products.description, `%${input.search}%`),
        like(products.tags, `%${input.search}%`)
      ) as any
    );
  if (input?.minPrice !== undefined)
    conditions.push(sql`${products.price} >= ${input.minPrice}` as any);
  if (input?.maxPrice !== undefined)
    conditions.push(sql`${products.price} <= ${input.maxPrice}` as any);
  if (input?.minRating !== undefined)
    conditions.push(sql`${products.rating} >= ${input.minRating}` as any);
  const order =
    input?.sort === "price_asc"
      ? products.price
      : input?.sort === "price_desc"
        ? desc(products.price)
        : input?.sort === "best"
          ? desc(products.salesCount)
          : input?.sort === "rating"
            ? desc(products.rating)
            : desc(products.createdAt);
  return db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(order as any);
}
export async function getProductReviews(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ review: reviews, user: users })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
}
export async function recordDownload(
  userId: number,
  productId: number,
  orderId: number
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(downloads)
    .where(
      and(
        eq(downloads.userId, userId),
        eq(downloads.productId, productId),
        eq(downloads.orderId, orderId)
      )
    )
    .limit(1);
  if (existing[0])
    await db
      .update(downloads)
      .set({
        downloadCount: sql`${downloads.downloadCount} + 1`,
        lastDownloadedAt: new Date(),
      })
      .where(eq(downloads.id, existing[0].id));
  else
    await db.insert(downloads).values({
      userId,
      productId,
      orderId,
      downloadCount: 1,
      lastDownloadedAt: new Date(),
    });
}
export async function getDownloadStats(
  userId: number,
  productId: number,
  orderId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(downloads)
    .where(
      and(
        eq(downloads.userId, userId),
        eq(downloads.productId, productId),
        eq(downloads.orderId, orderId)
      )
    )
    .limit(1);
  return rows[0];
}
export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .limit(1);
  return rows[0];
}
export async function createUserNotification(
  userId: number,
  title: string,
  body: string,
  kind: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, title, body, kind });
}
export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}
export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
}
export async function getPaymentMethods() {
  const db = await getDb();
  return db
    ? db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.enabled, true))
        .orderBy(paymentMethods.name)
    : [];
}
export async function createOrder(
  userId: number,
  customerName: string,
  customerEmail: string,
  items: Array<{ productId: number; quantity: number }>,
  requestedCurrency: Currency = baseCurrency
) {
  const db = getDb();
  const selectedCurrency = currencyInput.parse(requestedCurrency);
  if (
    !items.length ||
    items.some(
      item =>
        item.quantity !== 1 ||
        !Number.isInteger(item.productId) ||
        item.productId < 1
    ) ||
    new Set(items.map(item => item.productId)).size !== items.length
  )
    throw new Error("Choose distinct products");
  return db.transaction(async tx => {
    const [settings] = await tx
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 1));
    const config = currencyConfig(
      settings ?? { usdRate: null, sgdRate: null, mmkRate: null }
    );
    const exchangeRate = config.rates[selectedCurrency];
    if (!exchangeRate)
      throw new Error("Exchange rate is not configured for this currency.");
    const ids = items.map(item => item.productId);
    const found = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.status, "published"),
          sql`${products.id} in (${sql.join(
            ids.map(id => sql`${id}`),
            sql`, `
          )})`
        )
      );
    if (found.length !== items.length)
      throw new Error("One or more products are unavailable");
    // Work in cents, not accumulated floating-point prices.
    const cents = found.reduce(
      (sum, product) =>
        sum + Math.round(Number(product.discountPrice ?? product.price) * 100),
      0
    );
    const total = (cents / 100).toFixed(2);
    const payablePrices = found.map(product =>
      convertAmount(
        product.discountPrice ?? product.price,
        exchangeRate,
        selectedCurrency
      )
    );
    const payableTotal = sumAmounts(payablePrices);
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        customerName,
        customerEmail,
        subtotal: total,
        total,
        discount: "0.00",
        currency: selectedCurrency,
        exchangeRate,
        payableTotal,
      })
      .returning({ id: orders.id });
    await tx.insert(orderItems).values(
      found.map((product, index) => ({
        orderId: order.id,
        productId: product.id,
        titleSnapshot: product.title,
        unitPrice: String(product.discountPrice ?? product.price),
        payableUnitPrice: payablePrices[index],
        quantity: 1,
      }))
    );
    await emitOrderNotification(tx, {
      kind: "order_created",
      eventKey: `order:${order.id}:created`,
      userId,
      orderId: order.id,
    });
    return {
      orderId: order.id,
      total,
      currency: selectedCurrency,
      exchangeRate,
      payableTotal,
      items: found,
    };
  });
}
export async function getOrderForUser(userId: number, orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  return rows[0];
}
export async function getPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      order: orders,
      item: orderItems,
      product: products,
      download: downloads,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(
      downloads,
      and(
        eq(downloads.orderId, orders.id),
        eq(downloads.productId, orderItems.productId),
        eq(downloads.userId, userId)
      )
    )
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}
export async function getAdminPayments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ payment: payments, order: orders, user: users })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(users, eq(users.id, payments.userId))
    .orderBy(desc(payments.createdAt));
}
export async function setPaymentStatus(
  paymentId: number,
  status: "approved" | "rejected",
  adminId: number,
  rejectionReason?: string
) {
  const db = getDb();
  if (status === "rejected" && !rejectionReason?.trim())
    throw new Error("A rejection reason is required");
  return db.transaction(async tx => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for("update");
    if (!payment) throw new Error("Payment not found");
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .for("update");
    if (payment.status === status) return payment.orderId;
    if (payment.status !== "pending" || order.paymentStatus === "approved")
      throw new Error("Payment has already been reviewed");
    await tx
      .update(payments)
      .set({
        status,
        rejectionReason: status === "rejected" ? rejectionReason!.trim() : null,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
    await tx
      .update(orders)
      .set({
        paymentStatus: status,
        orderStatus: status === "approved" ? "paid" : "payment_rejected",
      })
      .where(eq(orders.id, order.id));
    if (status === "approved") {
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      for (const item of items)
        await tx
          .update(products)
          .set({ salesCount: sql`${products.salesCount} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
    }
    await tx.insert(activityLogs).values({
      actorId: adminId,
      action: status === "approved" ? "Payment approved" : "Payment rejected",
      target: `payment:${payment.id}`,
    });
    await emitOrderNotification(tx, {
      userId: payment.userId,
      orderId: order.id,
      paymentId: payment.id,
      actorId: adminId,
      kind: status === "approved" ? "payment_approved" : "payment_rejected",
      eventKey: `payment:${payment.id}:${status}`,
      reason: rejectionReason?.trim(),
    });
    return order.id;
  });
}
export async function toggleWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(wishlists)
    .where(
      and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))
    )
    .limit(1);
  if (existing[0]) {
    await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
    return false;
  }
  await db.insert(wishlists).values({ userId, productId });
  return true;
}
export async function getWishlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ wishlist: wishlists, product: products })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, userId));
}
export async function createPayment(input: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db
    .insert(payments)
    .values(input)
    .returning({ id: payments.id });
  return result.id;
}
export async function getApprovedOrderForProduct(
  userId: number,
  productId: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ order: orders })
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
  return rows[0]?.order;
}
export async function isApprovedOwner(userId: number, productId: number) {
  return Boolean(await getApprovedOrderForProduct(userId, productId));
}
export {
  categories,
  products,
  orders,
  orderItems,
  payments,
  paymentMethods,
  downloads,
  reviews,
  wishlists,
  users,
  notifications,
};

export async function ensureMarketplaceUser(identity: {
  id: string;
  name: string;
  email: string;
}) {
  const db = getDb();
  const [user] = await db
    .insert(users)
    .values({
      openId: `auth:${identity.id}`,
      authUserId: identity.id,
      name: identity.name,
      email: identity.email,
      loginMethod: "better-auth",
    })
    .onConflictDoUpdate({
      target: users.authUserId,
      set: { name: identity.name, email: identity.email },
    })
    .returning();
  return user;
}
