import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  isNull,
  isNotNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "./database";
import { emitOrderNotification } from "./notifications";
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
import {
  adminListInput,
  adminPageSize,
  paginationFor,
  defaultAdminSort,
} from "@marketplace/shared/pagination";

export async function adminOverview(raw: unknown = {}) {
  const input = adminListInput.parse(raw);
  const db = getDb();
  const result = {
    products: [] as (typeof products.$inferSelect)[],
    categories: [] as (typeof categories.$inferSelect & {
      productCount: number;
    })[],
    categoryOptions: [] as { id: number; name: string }[],
    productOptions: [] as { id: number; title: string }[],
    orders: [] as (typeof orders.$inferSelect & {
      items: (typeof orderItems.$inferSelect)[];
    })[],
    payments: [] as (typeof payments.$inferSelect)[],
    methods: [] as (typeof paymentMethods.$inferSelect)[],
    stats: { revenue: 0, approvedOrders: 0, pendingPayments: 0, products: 0 },
    summary: {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
      awaitingPayment: 0,
      awaitingDelivery: 0,
      completed: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      products: 0,
    },
    pagination: paginationFor(0, 1),
  };
  const search = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
  const conditions: SQL[] = [];
  const table =
    input.section === "products"
      ? products
      : input.section === "categories"
        ? categories
        : input.section === "payments"
          ? payments
          : orders;
  if (input.createdFrom)
    conditions.push(gte(table.createdAt, new Date(input.createdFrom)));
  if (input.createdTo)
    conditions.push(lte(table.createdAt, new Date(input.createdTo)));
  const value =
    input.section === "products"
      ? sql`coalesce(${products.discountPrice}, ${products.price})`
      : input.section === "payments"
        ? payments.amount
        : orders.total;
  if (input.minValue !== undefined)
    conditions.push(sql`${value} >= ${input.minValue}`);
  if (input.maxValue !== undefined)
    conditions.push(sql`${value} <= ${input.maxValue}`);
  const sort = input.sort ?? defaultAdminSort(input.section);
  const name = input.section === "products" ? products.title : categories.name;
  const sorting =
    sort === "oldest"
      ? [asc(table.createdAt), asc(table.id)]
      : sort === "value_asc"
        ? [asc(value), desc(table.createdAt), desc(table.id)]
        : sort === "value_desc"
          ? [desc(value), desc(table.createdAt), desc(table.id)]
          : sort === "name_asc"
            ? [asc(name), asc(table.id)]
            : sort === "name_desc"
              ? [desc(name), desc(table.id)]
              : [desc(table.createdAt), desc(table.id)];

  // Summary cards describe the whole section, independent of search and pagination.
  if (input.section === "products" || input.section === "categories") {
    const [counts] = await db
      .select({
        products: sql<number>`count(*)::int`,
        published: sql<number>`count(*) filter(where ${products.status} = 'published')::int`,
        draft: sql<number>`count(*) filter(where ${products.status} = 'draft')::int`,
        archived: sql<number>`count(*) filter(where ${products.status} = 'archived')::int`,
      })
      .from(products);
    Object.assign(result.summary, counts, { total: counts.products });
    if (input.section === "categories") {
      const [counts] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(categories);
      result.summary.total = counts.total;
    }
  } else if (input.section === "orders" || input.section === "payments") {
    const table = input.section === "orders" ? orders : payments;
    const status =
      input.section === "orders" ? orders.paymentStatus : payments.status;
    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter(where ${status} = 'pending')::int`,
        approved: sql<number>`count(*) filter(where ${status} = 'approved')::int`,
        rejected: sql<number>`count(*) filter(where ${status} = 'rejected')::int`,
      })
      .from(table);
    Object.assign(result.summary, counts);
    if (input.section === "orders") {
      const [counts] = await db
        .select({
          awaitingPayment: sql<number>`count(*) filter(where ${orders.orderStatus} = 'payment_pending')::int`,
          awaitingDelivery: sql<number>`count(*) filter(where ${orders.orderStatus} = 'paid')::int`,
          completed: sql<number>`count(*) filter(where ${orders.orderStatus} = 'completed')::int`,
        })
        .from(orders);
      Object.assign(result.summary, counts);
    }
  }

  if (input.section === "products") {
    if (input.categoryId)
      conditions.push(eq(products.categoryId, Number(input.categoryId)));
    if (input.featured !== "all")
      conditions.push(eq(products.featured, input.featured === "yes"));
    if (input.discount === "discounted")
      conditions.push(isNotNull(products.discountPrice));
    if (input.discount === "regular")
      conditions.push(isNull(products.discountPrice));
    if (!["all", "draft", "published", "archived"].includes(input.status))
      throw new HttpError(400, "Invalid product status");
    if (input.query)
      conditions.push(
        or(ilike(products.title, search), ilike(products.slug, search))!
      );
    if (
      input.status === "draft" ||
      input.status === "published" ||
      input.status === "archived"
    )
      conditions.push(eq(products.status, input.status));
    const where = and(...conditions);
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(where);
    result.pagination = paginationFor(total, input.page);
    [result.products, result.categoryOptions] = await Promise.all([
      db
        .select()
        .from(products)
        .where(where)
        .orderBy(...sorting)
        .limit(adminPageSize)
        .offset((result.pagination.page - 1) * adminPageSize),
      // Form options and row category names, independent of the categories list page.
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name), asc(categories.id)),
    ]);
  } else if (input.section === "categories") {
    if (input.query)
      conditions.push(
        or(
          ilike(categories.name, search),
          ilike(categories.slug, search),
          ilike(categories.description, search)
        )!
      );
    const where = and(...conditions);
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(categories)
      .where(where);
    result.pagination = paginationFor(total, input.page);
    result.categories = await db
      .select({
        ...getTableColumns(categories),
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .where(where)
      .groupBy(categories.id)
      .orderBy(...sorting)
      .limit(adminPageSize)
      .offset((result.pagination.page - 1) * adminPageSize);
  } else if (input.section === "orders" || input.section === "dashboard") {
    if (input.section === "orders") {
      result.productOptions = await db
        .select({ id: products.id, title: products.title })
        .from(products)
        .orderBy(asc(products.title), asc(products.id));
      if (input.productId)
        conditions.push(
          sql`exists (select 1 from ${orderItems} where ${orderItems.orderId} = ${orders.id} and ${orderItems.productId} = ${Number(input.productId)})`
        );
    }
    if (input.query)
      conditions.push(
        or(
          ilike(sql`${orders.id}::text`, search),
          ilike(orders.customerName, search),
          ilike(orders.customerEmail, search)
        )!
      );
    if (
      input.status === "pending" ||
      input.status === "approved" ||
      input.status === "rejected"
    )
      conditions.push(eq(orders.paymentStatus, input.status));
    if (
      input.status === "payment_pending" ||
      input.status === "paid" ||
      input.status === "completed" ||
      input.status === "payment_rejected"
    )
      conditions.push(eq(orders.orderStatus, input.status));
    const where = and(...conditions);
    if (input.section === "orders") {
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(orders)
        .where(where);
      result.pagination = paginationFor(total, input.page);
    }
    const orderRows = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(...sorting)
      .limit(input.section === "dashboard" ? 5 : adminPageSize)
      .offset(
        input.section === "dashboard"
          ? 0
          : (result.pagination.page - 1) * adminPageSize
      );
    const itemRows = orderRows.length
      ? await db
          .select()
          .from(orderItems)
          .where(
            inArray(
              orderItems.orderId,
              orderRows.map(order => order.id)
            )
          )
          .orderBy(asc(orderItems.id))
      : [];
    result.orders = orderRows.map(order => ({
      ...order,
      items: itemRows.filter(item => item.orderId === order.id),
    }));
    if (input.section === "dashboard") {
      const [orderStats, paymentStats, productStats] = await Promise.all([
        db
          .select({
            revenue: sql<string>`coalesce(sum(${orders.total}) filter(where ${orders.paymentStatus} = 'approved'),0)`,
            approved: sql<number>`count(*) filter(where ${orders.paymentStatus}='approved')::int`,
          })
          .from(orders),
        db
          .select({ pending: sql<number>`count(*)::int` })
          .from(payments)
          .where(eq(payments.status, "pending")),
        db.select({ total: sql<number>`count(*)::int` }).from(products),
      ]);
      result.stats = {
        revenue: Number(orderStats[0].revenue),
        approvedOrders: orderStats[0].approved,
        pendingPayments: paymentStats[0].pending,
        products: productStats[0].total,
      };
    }
  } else if (input.section === "payments") {
    if (input.paymentMethod !== "all")
      conditions.push(eq(payments.paymentMethod, input.paymentMethod));
    if (!["all", "pending", "approved", "rejected"].includes(input.status))
      throw new HttpError(400, "Invalid payment status");
    if (input.query)
      conditions.push(
        or(
          ilike(sql`${payments.id}::text`, search),
          ilike(sql`${payments.orderId}::text`, search),
          ilike(payments.senderName, search),
          ilike(payments.transactionReference, search)
        )!
      );
    if (
      input.status === "pending" ||
      input.status === "approved" ||
      input.status === "rejected"
    )
      conditions.push(eq(payments.status, input.status));
    const where = and(...conditions);
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(payments)
      .where(where);
    result.pagination = paginationFor(total, input.page);
    result.payments = await db
      .select()
      .from(payments)
      .where(where)
      .orderBy(...sorting)
      .limit(adminPageSize)
      .offset((result.pagination.page - 1) * adminPageSize);
  } else if (input.section === "settings") {
    result.methods = await db
      .select()
      .from(paymentMethods)
      .orderBy(asc(paymentMethods.name));
  }
  return result;
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
  if (method.currency !== owned.currency)
    throw new HttpError(
      400,
      "Choose a payment account that matches the order currency."
    );
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
        currency: order.currency,
        payableAmount: order.payableTotal ?? order.total,
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
    await emitOrderNotification(tx, {
      kind: "payment_submitted",
      eventKey: `payment:${payment.id}:submitted`,
      userId,
      orderId: order.id,
      paymentId: payment.id,
    });
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
