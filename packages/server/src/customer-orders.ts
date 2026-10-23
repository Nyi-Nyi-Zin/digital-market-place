import { eq, desc } from "drizzle-orm";
import { getDb } from "./database";
import { orders, orderItems, payments, products, downloads } from "./schema";
export async function customerOrders(userId: number) {
  const db = getDb();
  const owned = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  const lines = await db
    .select({ item: orderItems, slug: products.slug })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orders.userId, userId));
  const evidence = await db
    .select({
      orderId: payments.orderId,
      id: payments.id,
      status: payments.status,
      rejectionReason: payments.rejectionReason,
    })
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.id));
  const history = await db
    .select()
    .from(downloads)
    .where(eq(downloads.userId, userId));
  return owned.map(order => ({
    ...order,
    items: lines
      .filter(row => row.item.orderId === order.id)
      .map(row => ({
        ...row.item,
        slug: row.slug,
        download: history.find(
          d => d.orderId === order.id && d.productId === row.item.productId
        ),
      })),
    latestPayment: evidence.find(p => p.orderId === order.id),
  }));
}
export type CustomerOrder = Awaited<ReturnType<typeof customerOrders>>[number];
