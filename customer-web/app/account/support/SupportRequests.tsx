"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { NativeSelect } from "../../components/ui/native-select";
import { useI18n } from "../../components/I18nProvider";
import { api } from "../../lib/api";
import type { listTickets, ticketDetail } from "@marketplace/server/support";
import type { CustomerOrder } from "@marketplace/server/customer-orders";
import { formatDate } from "@marketplace/shared/format";
const isAdmin = false;
const SupportHeading = isAdmin ? "h2" : "h1";
const base = isAdmin ? "/api/admin/support" : "/api/support";
const path = isAdmin ? "/support" : "/account/support";
export function SupportRequests({
  initialOrder = "",
}: {
  initialOrder?: string;
}) {
  const { t, intlLocale } = useI18n(),
    router = useRouter(),
    client = useQueryClient();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("all");
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [orderId, setOrderId] = useState(initialOrder);
  const list = useQuery({
    queryKey: ["support", isAdmin, page, status],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof listTickets>>>(
        `${base}?page=${page}&status=${status}`,
        { signal }
      ),
    refetchInterval: 30000,
  });
  const orders = useQuery({
    queryKey: ["orders"],
    enabled: !isAdmin,
    queryFn: () => api<{ orders: CustomerOrder[] }>("/api/orders"),
  });
  const create = useMutation({
    mutationFn: () =>
      api<{ ticket: { id: number } }>(base, {
        method: "POST",
        body: JSON.stringify({
          subject,
          message,
          ...(orderId ? { orderId: Number(orderId) } : {}),
        }),
      }),
    onSuccess: async data => {
      await client.invalidateQueries({ queryKey: ["support"] });
      toast.success(t("Support request created"));
      router.push(`${path}/${data.ticket.id}`);
    },
  });
  return (
    <div className="operations-page">
      <SupportHeading>
        {t(isAdmin ? "Support requests" : "My support requests")}
      </SupportHeading>
      <div className="page-actions">
        <label>
          {t("Status")}
          <NativeSelect
            aria-label={t("Status")}
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("All")}</option>
            <option value="open">{t("Open")}</option>
            <option value="closed">{t("Closed")}</option>
          </NativeSelect>
        </label>
        <Button
          variant="outline"
          disabled={list.isFetching}
          onClick={() => list.refetch()}
        >
          {t("Refresh")}
        </Button>
      </div>
      {list.isPending ? (
        <p role="status">{t("Loading support requests")}</p>
      ) : list.error ? (
        <div role="alert">
          <p>{t(list.error.message)}</p>
          <Button onClick={() => list.refetch()}>{t("Try again")}</Button>
        </div>
      ) : (
        <>
          <div className="support-list">
            {list.data.tickets.length ? (
              list.data.tickets.map(ticket => (
                <Link
                  className="information-panel"
                  href={`${path}/${ticket.id}`}
                  key={ticket.id}
                >
                  <div>
                    <strong>
                      #{ticket.id} · {ticket.subject}
                    </strong>
                    <p>
                      {isAdmin ? ticket.customerName : null}
                      {ticket.orderId
                        ? ` · ${t("Order #{id}", { id: ticket.orderId })}`
                        : null}
                    </p>
                    <small>{formatDate(ticket.updatedAt, intlLocale)}</small>
                  </div>
                  <span className="pill">
                    {t(ticket.status === "open" ? "Open" : "Closed")}
                  </span>
                </Link>
              ))
            ) : (
              <p>{t("No support requests found")}</p>
            )}
          </div>
          <div className="page-actions">
            <Button
              variant="outline"
              disabled={list.data.page <= 1 || list.isFetching}
              onClick={() => setPage(list.data.page - 1)}
            >
              {t("Previous")}
            </Button>
            <span>
              {t("Showing page {page} of {pages}", {
                page: list.data.page,
                pages: list.data.pages,
              })}
            </span>
            <Button
              variant="outline"
              disabled={list.data.page >= list.data.pages || list.isFetching}
              onClick={() => setPage(list.data.page + 1)}
            >
              {t("Next")}
            </Button>
          </div>
        </>
      )}
      {!isAdmin && (
        <section className="information-panel">
          <h2>{t("New support request")}</h2>
          <p>
            {t(
              "Replies appear here. Do not include passwords or payment account credentials."
            )}
          </p>
          <form
            className="support-form"
            onSubmit={e => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <label>
              {t("Related order")}
              <NativeSelect
                aria-label={t("Related order")}
                value={orderId}
                disabled={
                  orders.isPending || !!orders.error || create.isPending
                }
                onChange={e => setOrderId(e.target.value)}
              >
                <option value="">{t("General account question")}</option>
                {orders.data?.orders.map(order => (
                  <option value={order.id} key={order.id}>
                    {t("Order #{id}", { id: order.id })}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {orders.error && (
              <p role="alert">
                {t(orders.error.message)}{" "}
                <Button type="button" onClick={() => orders.refetch()}>
                  {t("Try again")}
                </Button>
              </p>
            )}
            <label>
              {t("Subject")}
              <Input
                required
                minLength={3}
                maxLength={180}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={create.isPending}
              />
            </label>
            <label>
              {t("Message")}
              <Textarea
                required
                minLength={3}
                maxLength={5000}
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={create.isPending}
              />
            </label>
            <Button
              type="submit"
              disabled={create.isPending || orders.isPending || !!orders.error}
            >
              {t(create.isPending ? "Saving…" : "Create support request")}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
export function SupportConversation({ id }: { id: string }) {
  const { t, intlLocale } = useI18n(),
    client = useQueryClient();
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["support", isAdmin, id],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof ticketDetail>>>(`${base}/${id}`, {
        signal,
      }),
    refetchInterval: 15000,
  });
  const reply = useMutation({
    mutationFn: () =>
      api(`${base}/${id}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: async () => {
      setMessage("");
      await client.invalidateQueries({ queryKey: ["support"] });
      toast.success(t("Reply sent"));
    },
  });
  const change = useMutation({
    mutationFn: (status: string) =>
      api(`${base}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["support"] });
      toast.success(t("Changes saved."));
    },
  });
  if (query.isPending)
    return <p role="status">{t("Loading support requests")}</p>;
  if (query.error)
    return (
      <div role="alert">
        <p>{t(query.error.message)}</p>
        <Link href={path}>{t("Back to support requests")}</Link>
        <Button onClick={() => query.refetch()}>{t("Try again")}</Button>
      </div>
    );
  const { ticket, messages } = query.data;
  return (
    <div className="operations-page">
      <Link href={path}>← {t("Back to support requests")}</Link>
      <section className="information-panel">
        <SupportHeading>
          #{ticket.id} · {ticket.subject}
        </SupportHeading>
        <p>{t(ticket.status === "open" ? "Open" : "Closed")}</p>
        {ticket.orderId && (
          <Link
            href={
              isAdmin
                ? `/orders/${ticket.orderId}`
                : `/account/purchases/${ticket.orderId}`
            }
          >
            {t("Order #{id}", { id: ticket.orderId })}
          </Link>
        )}
        {isAdmin && (
          <div className="page-actions">
            <Button
              variant="outline"
              disabled={change.isPending || reply.isPending}
              onClick={() =>
                change.mutate(ticket.status === "open" ? "closed" : "open")
              }
            >
              {t(
                ticket.status === "open" ? "Mark as resolved" : "Reopen request"
              )}
            </Button>
          </div>
        )}
      </section>
      <div className="support-thread" role="log" aria-label={t("Conversation")}>
        {messages.map(m => (
          <article
            className="support-message"
            data-author={m.audience}
            key={m.id}
          >
            <strong>
              {t(m.audience === "admin" ? "Support team" : "Customer")}
            </strong>
            <small>{formatDate(m.createdAt, intlLocale)}</small>
            <p>{m.body}</p>
          </article>
        ))}
      </div>
      <form
        className="support-form information-panel"
        onSubmit={e => {
          e.preventDefault();
          reply.mutate();
        }}
      >
        <label>
          {t("Reply")}
          <Textarea
            required
            maxLength={5000}
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={reply.isPending || change.isPending}
          />
        </label>
        {ticket.status === "closed" && (
          <p>{t("Sending a reply reopens this request.")}</p>
        )}
        <Button
          type="submit"
          disabled={reply.isPending || change.isPending || !message.trim()}
        >
          {t(reply.isPending ? "Saving…" : "Send reply")}
        </Button>
      </form>
    </div>
  );
}
