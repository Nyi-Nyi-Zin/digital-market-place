import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./database";
import { orders, supportTickets, supportMessages, users } from "./schema";
import {
  newTicketInput,
  pageInput,
  positiveId,
  ticketReplyInput,
  ticketStatusInput,
} from "@marketplace/shared/store";
import { HttpError } from "./http";
import { recordActivity } from "./activity";

export async function listTickets(ownerId: number | undefined, raw: unknown) {
  const input = z
    .object({
      page: pageInput,
      status: z.enum(["all", "open", "closed"]).default("all"),
    })
    .parse(raw);
  const db = getDb();
  const where = and(
    ownerId === undefined ? undefined : eq(supportTickets.userId, ownerId),
    input.status === "all" ? undefined : eq(supportTickets.status, input.status)
  );
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(where);
  const pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(input.page, pages);
  const tickets = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      orderId: supportTickets.orderId,
      status: supportTickets.status,
      updatedAt: supportTickets.updatedAt,
      customerName: users.name,
    })
    .from(supportTickets)
    .innerJoin(users, eq(users.id, supportTickets.userId))
    .where(where)
    .orderBy(desc(supportTickets.updatedAt), desc(supportTickets.id))
    .limit(20)
    .offset((page - 1) * 20);
  return { tickets, total, pages, page };
}
export async function ticketDetail(id: number, ownerId?: number) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.id, positiveId.parse(id)),
        ownerId === undefined ? undefined : eq(supportTickets.userId, ownerId)
      )
    );
  if (!ticket) throw new HttpError(404, "Support request not found");
  const messages = await db
    .select({
      id: supportMessages.id,
      body: supportMessages.body,
      audience: supportMessages.audience,
      createdAt: supportMessages.createdAt,
    })
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticket.id))
    .orderBy(asc(supportMessages.id));
  return { ticket, messages };
}
export async function createTicket(userId: number, raw: unknown) {
  const input = newTicketInput.parse(raw);
  return getDb().transaction(async tx => {
    if (input.orderId) {
      const [owned] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)));
      if (!owned) throw new HttpError(404, "Order not found");
    }
    // Lock the customer to serialize the open-request limit across concurrent submissions.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.userId, userId),
          eq(supportTickets.status, "open")
        )
      );
    if (total >= 20)
      throw new HttpError(409, "Please use an existing open support request.");
    const [ticket] = await tx
      .insert(supportTickets)
      .values({ userId, orderId: input.orderId, subject: input.subject })
      .returning();
    await tx.insert(supportMessages).values({
      ticketId: ticket.id,
      authorId: userId,
      audience: "customer",
      body: input.message,
    });
    return ticket;
  });
}
export async function replyToTicket(
  id: number,
  actorId: number,
  audience: "customer" | "admin",
  raw: unknown
) {
  const { message } = ticketReplyInput.parse(raw);
  return getDb().transaction(async tx => {
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.id, positiveId.parse(id)),
          audience === "customer"
            ? eq(supportTickets.userId, actorId)
            : undefined
        )
      )
      .for("update");
    if (!ticket) throw new HttpError(404, "Support request not found");
    await tx
      .insert(supportMessages)
      .values({ ticketId: id, authorId: actorId, audience, body: message });
    await tx
      .update(supportTickets)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(supportTickets.id, id));
    if (audience === "admin")
      await recordActivity(tx, actorId, "Support reply sent", `ticket:${id}`);
    return { success: true };
  });
}
export async function changeTicketStatus(
  id: number,
  actorId: number,
  raw: unknown
) {
  const { status } = ticketStatusInput.parse(raw);
  return getDb().transaction(async tx => {
    const [ticket] = await tx
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, positiveId.parse(id)))
      .for("update");
    if (!ticket) throw new HttpError(404, "Support request not found");
    if (ticket.status !== status) {
      await tx
        .update(supportTickets)
        .set({ status, updatedAt: new Date() })
        .where(eq(supportTickets.id, id));
      await recordActivity(
        tx,
        actorId,
        status === "closed"
          ? "Support request closed"
          : "Support request reopened",
        `ticket:${id}`
      );
    }
    return { success: true };
  });
}
