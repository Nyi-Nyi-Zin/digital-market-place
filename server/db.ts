import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, products, orders, orderItems, payments, paymentMethods, downloads, reviews, wishlists, notifications } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  values.lastSignedIn ??= new Date(); updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0]; }
export async function listCategories() { const db = await getDb(); return db ? db.select().from(categories).orderBy(categories.name) : []; }
export async function listProducts(input?: { search?: string; categoryId?: number; featured?: boolean; sort?: string; minPrice?: number; maxPrice?: number; minRating?: number }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(products.status, "published")];
  if (input?.categoryId) conditions.push(eq(products.categoryId, input.categoryId));
  if (input?.featured) conditions.push(eq(products.featured, true));
  if (input?.search) conditions.push(or(like(products.title, `%${input.search}%`), like(products.description, `%${input.search}%`), like(products.tags, `%${input.search}%`)) as any);
  if (input?.minPrice !== undefined) conditions.push(sql`${products.price} >= ${input.minPrice}` as any);
  if (input?.maxPrice !== undefined) conditions.push(sql`${products.price} <= ${input.maxPrice}` as any);
  if (input?.minRating !== undefined) conditions.push(sql`${products.rating} >= ${input.minRating}` as any);
  const order = input?.sort === "price_asc" ? products.price : input?.sort === "price_desc" ? desc(products.price) : input?.sort === "best" ? desc(products.salesCount) : input?.sort === "rating" ? desc(products.rating) : desc(products.createdAt);
  return db.select({ product: products, category: categories }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(...conditions)).orderBy(order as any);
}
export async function getProductReviews(productId: number) { const db = await getDb(); if (!db) return []; return db.select({ review: reviews, user: users }).from(reviews).innerJoin(users, eq(users.id, reviews.userId)).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt)); }
export async function recordDownload(userId: number, productId: number, orderId: number) { const db = await getDb(); if (!db) return; const existing = await db.select().from(downloads).where(and(eq(downloads.userId, userId), eq(downloads.productId, productId), eq(downloads.orderId, orderId))).limit(1); if (existing[0]) await db.update(downloads).set({ downloadCount: sql`${downloads.downloadCount} + 1`, lastDownloadedAt: new Date() }).where(eq(downloads.id, existing[0].id)); else await db.insert(downloads).values({ userId, productId, orderId, downloadCount: 1, lastDownloadedAt: new Date() }); }
export async function getDownloadStats(userId: number, productId: number, orderId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(downloads).where(and(eq(downloads.userId, userId), eq(downloads.productId, productId), eq(downloads.orderId, orderId))).limit(1); return rows[0]; }
export async function getProductBySlug(slug: string) { const db = await getDb(); if (!db) return undefined; const rows = await db.select({ product: products, category: categories }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.status, "published"))).limit(1); return rows[0]; }
export async function createUserNotification(userId: number, title: string, body: string, kind: string) { const db = await getDb(); if (!db) return; await db.insert(notifications).values({ userId, title, body, kind }); }
export async function getUserNotifications(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)); }
export async function markNotificationsRead(userId: number) { const db = await getDb(); if (!db) return; await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId)); }
export async function getPaymentMethods() { const db = await getDb(); return db ? db.select().from(paymentMethods).where(eq(paymentMethods.enabled, true)).orderBy(paymentMethods.name) : []; }
export async function createOrder(userId: number, customerName: string, customerEmail: string, items: Array<{ productId: number; quantity: number }>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const ids = items.map(i => i.productId); const found = await db.select().from(products).where(and(eq(products.status, "published"), sql`${products.id} in (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`));
  if (found.length !== items.length) throw new Error("One or more products are unavailable");
  const total = found.reduce((sum, p) => { const item = items.find(i => i.productId === p.id)!; return sum + Number(p.discountPrice ?? p.price) * Math.max(1, item.quantity); }, 0);
  const result = await db.insert(orders).values({ userId, customerName, customerEmail, subtotal: total.toFixed(2), total: total.toFixed(2), discount: "0.00" });
  const orderId = Number(result[0].insertId);
  await db.insert(orderItems).values(found.map(p => { const item = items.find(i => i.productId === p.id)!; return { orderId, productId: p.id, titleSnapshot: p.title, unitPrice: String(p.discountPrice ?? p.price), quantity: Math.max(1, item.quantity) }; }));
  return { orderId, total: total.toFixed(2), items: found };
}
export async function getOrderForUser(userId: number, orderId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1); return rows[0]; }
export async function getPurchases(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ order: orders, item: orderItems, product: products, download: downloads }).from(orders).innerJoin(orderItems, eq(orderItems.orderId, orders.id)).innerJoin(products, eq(products.id, orderItems.productId)).leftJoin(downloads, and(eq(downloads.orderId, orders.id), eq(downloads.productId, orderItems.productId), eq(downloads.userId, userId))).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)); }
export async function getAdminPayments() { const db = await getDb(); if (!db) return []; return db.select({ payment: payments, order: orders, user: users }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).innerJoin(users, eq(users.id, payments.userId)).orderBy(desc(payments.createdAt)); }
export async function setPaymentStatus(paymentId: number, status: "approved" | "rejected", adminId: number, rejectionReason?: string) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const payment = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0]; if (!payment) throw new Error("Payment not found"); await db.update(payments).set({ status, rejectionReason: rejectionReason ?? null, verifiedBy: adminId, verifiedAt: new Date() }).where(eq(payments.id, paymentId)); await db.update(orders).set({ paymentStatus: status, orderStatus: status === "approved" ? "completed" : "payment_rejected" }).where(eq(orders.id, payment.orderId)); if (status === "approved") { const items = await db.select().from(orderItems).where(eq(orderItems.orderId, payment.orderId)); for (const item of items) await db.update(products).set({ salesCount: sql`${products.salesCount} + ${item.quantity}` }).where(eq(products.id, item.productId)); await createUserNotification(payment.userId, "Payment approved", `Order #${payment.orderId} is complete. Your digital products are ready in My Purchases.`, "payment_approved"); await createUserNotification(payment.userId, "Product purchased", `Access has been granted for order #${payment.orderId}.`, "product_purchased"); } else { await createUserNotification(payment.userId, "Payment rejected", `Order #${payment.orderId} needs attention. ${rejectionReason ?? "Please contact support to resubmit."}`, "payment_rejected"); } return payment.orderId; }
export async function toggleWishlist(userId: number, productId: number) { const db = await getDb(); if (!db) return false; const existing = await db.select().from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))).limit(1); if (existing[0]) { await db.delete(wishlists).where(eq(wishlists.id, existing[0].id)); return false; } await db.insert(wishlists).values({ userId, productId }); return true; }
export async function getWishlist(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ wishlist: wishlists, product: products }).from(wishlists).innerJoin(products, eq(products.id, wishlists.productId)).where(eq(wishlists.userId, userId)); }
export async function createPayment(input: typeof payments.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(payments).values(input); return Number(result[0].insertId); }
export async function getApprovedOrderForProduct(userId: number, productId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select({ order: orders }).from(orders).innerJoin(orderItems, eq(orderItems.orderId, orders.id)).where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), eq(orders.paymentStatus, "approved"))).limit(1); return rows[0]?.order; }
export async function isApprovedOwner(userId: number, productId: number) { return Boolean(await getApprovedOrderForProduct(userId, productId)); }
export { categories, products, orders, orderItems, payments, paymentMethods, downloads, reviews, wishlists, users, notifications };
