import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./database";
import {
  orders,
  orderItems,
  orderNotes,
  payments,
  products,
  users,
  activityLogs,
} from "./schema";
import {
  pageInput,
  positiveId,
  reportInput,
  ticketReplyInput,
  csvCell,
} from "@marketplace/shared/store";
import { HttpError } from "./http";
import { recordActivity } from "./activity";

export async function orderDetail(id: number, ownerId?: number) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, positiveId.parse(id)),
        ownerId === undefined ? undefined : eq(orders.userId, ownerId)
      )
    );
  if (!order) throw new HttpError(404, "Order not found");
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      title: orderItems.titleSnapshot,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      payableUnitPrice: orderItems.payableUnitPrice,
      slug: products.slug,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id));
  const evidence = await db
    .select({
      id: payments.id,
      method: payments.paymentMethod,
      amount: payments.amount,
      currency: payments.currency,
      payableAmount: payments.payableAmount,
      status: payments.status,
      reference: payments.transactionReference,
      rejectionReason: payments.rejectionReason,
      createdAt: payments.createdAt,
      verifiedAt: payments.verifiedAt,
    })
    .from(payments)
    .where(eq(payments.orderId, id))
    .orderBy(desc(payments.id));
  return { order, items, payments: evidence };
}
export async function adminOrderDetail(id: number) {
  const data = await orderDetail(id);
  const db = getDb();
  const evidence = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, id))
    .orderBy(desc(payments.id));
  const notes = await db
    .select({
      id: orderNotes.id,
      body: orderNotes.body,
      author: users.name,
      createdAt: orderNotes.createdAt,
    })
    .from(orderNotes)
    .innerJoin(users, eq(users.id, orderNotes.authorId))
    .where(eq(orderNotes.orderId, id))
    .orderBy(desc(orderNotes.id));
  return { ...data, evidence, notes };
}
export async function addOrderNote(id: number, actorId: number, raw: unknown) {
  const { message } = ticketReplyInput.parse(raw);
  return getDb().transaction(async tx => {
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, positiveId.parse(id)));
    if (!order) throw new HttpError(404, "Order not found");
    await tx
      .insert(orderNotes)
      .values({ orderId: id, authorId: actorId, body: message });
    await recordActivity(tx, actorId, "Order note added", `order:${id}`);
    return { success: true };
  });
}
export async function listCustomers(raw: unknown) {
  const { query, page: requested } = z
    .object({ query: z.string().trim().max(160).default(""), page: pageInput })
    .parse(raw);
  const db = getDb(),
    search = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const where = and(
    or(
      eq(users.role, "user"),
      sql`exists(select 1 from ${orders} where ${orders.userId} = ${users.id})`
    ),
    query
      ? or(
          ilike(users.name, search),
          ilike(users.email, search),
          ilike(sql`${users.id}::text`, search)
        )
      : undefined
  );
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(where);
  const pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(requested, pages);
  const customers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      paidTotal: sql<string>`coalesce(sum(${orders.total}) filter(where ${orders.paymentStatus} = 'approved'),0)::text`,
      openOrders: sql<number>`count(${orders.id}) filter(where ${orders.orderStatus} <> 'completed')::int`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(where)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(20)
    .offset((page - 1) * 20);
  return { customers, page, pages, total };
}
export async function customerDetail(id: number, raw: unknown) {
  const db = getDb(),
    requested = pageInput.parse((raw as { page?: unknown }).page);
  const [customer] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, positiveId.parse(id)));
  if (!customer) throw new HttpError(404, "Customer not found");
  const [summary] = await db
    .select({
      total: sql<number>`count(*)::int`,
      paidTotal: sql<string>`coalesce(sum(${orders.total}) filter(where ${orders.paymentStatus} = 'approved'),0)::text`,
      openOrders: sql<number>`count(*) filter(where ${orders.orderStatus} <> 'completed')::int`,
    })
    .from(orders)
    .where(eq(orders.userId, id));
  const pages = Math.max(1, Math.ceil(summary.total / 20)),
    page = Math.min(requested, pages);
  const history = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(20)
    .offset((page - 1) * 20);
  return {
    customer,
    summary,
    orders: history,
    page,
    pages,
    total: summary.total,
  };
}
export async function listActivity(raw: unknown) {
  const { page: requested, query } = z
    .object({ page: pageInput, query: z.string().trim().max(160).default("") })
    .parse(raw);
  const db = getDb(),
    search = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const where = query
    ? or(
        ilike(activityLogs.action, search),
        ilike(activityLogs.target, search),
        ilike(users.name, search)
      )
    : undefined;
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.actorId))
    .where(where);
  const pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(requested, pages);
  const entries = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      target: activityLogs.target,
      actor: users.name,
      actorId: activityLogs.actorId,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.actorId))
    .where(where)
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(20)
    .offset((page - 1) * 20);
  return { entries, total, pages, page };
}
export async function salesReport(raw: unknown) {
  const input = reportInput.parse(raw),
    db = getDb();
  // Inclusive calendar dates in the store's Myanmar timezone; never depend on host timezone.
  const from = new Date(`${input.from}T00:00:00+06:30`),
    to = new Date(new Date(`${input.to}T00:00:00+06:30`).getTime() + 86400000);
  const where = and(
    sql`${orders.createdAt} >= ${from}`,
    sql`${orders.createdAt} < ${to}`,
    eq(orders.paymentStatus, "approved")
  );
  return db.transaction(
    async tx => {
      const [summary] = await tx
        .select({
          count: sql<number>`count(*)::int`,
          revenue: sql<string>`coalesce(sum(${orders.total}),0)::text`,
          delivered: sql<number>`count(*) filter(where ${orders.orderStatus} = 'completed')::int`,
        })
        .from(orders)
        .where(where);
      const day = sql<string>`to_char(${orders.createdAt} at time zone 'Asia/Yangon','YYYY-MM-DD')`;
      const daily = await tx
        .select({
          day,
          count: sql<number>`count(*)::int`,
          revenue: sql<string>`sum(${orders.total})::text`,
        })
        .from(orders)
        .where(where)
        .groupBy(day)
        .orderBy(day);
      const bestsellers = await tx
        .select({
          productId: orderItems.productId,
          title: products.title,
          quantity: sql<number>`sum(${orderItems.quantity})::int`,
          revenue: sql<string>`sum(${orderItems.unitPrice} * ${orderItems.quantity})::text`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(where)
        .groupBy(orderItems.productId, products.title)
        .orderBy(
          sql`sum(${orderItems.unitPrice} * ${orderItems.quantity}) desc`,
          asc(orderItems.productId)
        )
        .limit(20);
      const methods = await tx
        .select({
          method: payments.paymentMethod,
          count: sql<number>`count(*)::int`,
          revenue: sql<string>`sum(${payments.amount})::text`,
        })
        .from(payments)
        .innerJoin(orders, eq(orders.id, payments.orderId))
        .where(and(where, eq(payments.status, "approved")))
        .groupBy(payments.paymentMethod)
        .orderBy(asc(payments.paymentMethod));
      return { ...input, summary, daily, bestsellers, methods };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  );
}
export function reportCsv(report: Awaited<ReturnType<typeof salesReport>>) {
  const rows: unknown[][] = [
    ["From", report.from, "To", report.to],
    [
      "Approved orders",
      report.summary.count,
      "Approved revenue",
      report.summary.revenue,
    ],
    [],
    ["Day", "Orders", "Revenue"],
    ...report.daily.map(r => [r.day, r.count, r.revenue]),
    [],
    ["Product", "Quantity", "Line revenue (top 20)"],
    ...report.bestsellers.map(r => [r.title, r.quantity, r.revenue]),
    [],
    ["Payment method", "Approved payments", "Amount"],
    ...report.methods.map(r => [r.method, r.count, r.revenue]),
  ];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
