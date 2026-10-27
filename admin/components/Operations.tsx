"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useI18n } from "./I18nProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ConfirmAction } from "./ConfirmAction";
import { formatDate } from "@marketplace/shared/format";
import {
  formatPrice,
  formatOrderTotal,
  formatOrderItem,
  formatOrderSubtotal,
  formatOrderDiscount,
} from "@marketplace/shared/pricing";
import { resolveCurrency } from "@marketplace/shared/currency";
import { storageUrl } from "@marketplace/shared/storage";
import {
  adminStatusLabels,
  adminSortLabels,
  adminSortValues,
} from "@marketplace/shared/pagination";
import type { CustomerListInput } from "@marketplace/shared/customer-filters";
import { ArrowRight } from "lucide-react";
import { Pagination } from "./Pagination";
import { ListToolbar } from "./ListToolbar";
import { CustomerFilters } from "./CustomerFilters";
import { EmptyTableRow } from "./EmptyTable";
import { PageHeader } from "./PageHeader";
import type {
  listCustomers,
  customerDetail,
  listActivity,
  salesReport,
  adminOrderDetail,
} from "@marketplace/server/operations";

export function QueryState({
  query,
  children,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown };
  children: ReactNode;
}) {
  const { t } = useI18n();
  if (query.isPending) return <p role="status">{t("Loading…")}</p>;
  if (query.error)
    return (
      <div className="admin-panel" role="alert">
        <p>{t(query.error.message)}</p>
        <Button onClick={() => query.refetch()}>{t("Try again")}</Button>
      </div>
    );
  return children;
}
export function OperationsPager({
  data,
  busy,
  change,
}: {
  data: { page: number; pages: number };
  busy: boolean;
  change: (page: number) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="page-actions" aria-label={t("Pagination")}>
      <Button
        variant="outline"
        disabled={busy || data.page <= 1}
        onClick={() => change(data.page - 1)}
      >
        {t("Previous")}
      </Button>
      <span aria-live="polite">
        {t("Showing page {page} of {pages}", {
          page: data.page,
          pages: data.pages,
        })}
      </span>
      <Button
        variant="outline"
        disabled={busy || data.page >= data.pages}
        onClick={() => change(data.page + 1)}
      >
        {t("Next")}
      </Button>
    </nav>
  );
}
export function Customers() {
  const { t, intlLocale } = useI18n();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CustomerListInput>({
    query: "",
    page: 1,
    sort: "newest",
    orderHistory: "all",
  });
  useEffect(() => {
    if (search === view.query) return;
    const timer = setTimeout(
      () => setView(previous => ({ ...previous, query: search, page: 1 })),
      300
    );
    return () => clearTimeout(timer);
  }, [search, view.query]);
  const data = useQuery({
    queryKey: ["admin", "customers", view],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof listCustomers>>>(
        `/api/admin/customers?${new URLSearchParams({ query: view.query, page: String(view.page), sort: view.sort, orderHistory: view.orderHistory })}`,
        { signal }
      ),
    placeholderData: previous => previous,
  });
  const active = Boolean(
    search ||
      view.query ||
      view.sort !== "newest" ||
      view.orderHistory !== "all"
  );
  return (
    <div className="operations-page customer-list-page">
      <PageHeader
        title={t("Customers")}
        description={t("Customer accounts and purchase history")}
      />
      <div className="admin-list-card">
        <ListToolbar
          search={search}
          maxLength={160}
          placeholder={t("Name or email")}
          onSearch={setSearch}
          sort={view.sort}
          sortOptions={adminSortValues.map(value => ({
            value,
            label: adminSortLabels[value],
          }))}
          onSort={sort =>
            setView(previous => ({
              ...previous,
              query: search,
              sort: sort as CustomerListInput["sort"],
              page: 1,
            }))
          }
          active={active}
          onClear={() => {
            setSearch("");
            setView({
              query: "",
              page: 1,
              sort: "newest",
              orderHistory: "all",
            });
          }}
          filters={
            <CustomerFilters
              value={view.orderHistory}
              onApply={orderHistory =>
                setView(previous => ({
                  ...previous,
                  query: search,
                  orderHistory,
                  page: 1,
                }))
              }
            />
          }
        />
        <QueryState query={data}>
          {data.data && (
            <>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label={t("Customers")}
              >
                <table>
                  <caption className="sr-only">{t("Customers")}</caption>
                  <thead>
                    <tr>
                      {[
                        "Customer",
                        "Orders",
                        "Approved revenue",
                        "Unfinished orders",
                        "Actions",
                      ].map(label => (
                        <th key={label} scope="col">
                          {t(label)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.customers.map(customer => {
                      const name =
                        customer.name || customer.email || t("Customer");
                      const parts = name.trim().split(/\s+/);
                      const initials = [
                        parts[0],
                        ...(parts.length > 1 ? [parts[parts.length - 1]] : []),
                      ]
                        .map(part => Array.from(part)[0])
                        .join("")
                        .toLocaleUpperCase();
                      return (
                        <tr key={customer.id}>
                          <td>
                            <div className="admin-table-identity">
                              <span
                                className="customer-avatar"
                                aria-hidden="true"
                              >
                                {initials}
                              </span>
                              <span>
                                <Link href={`/customers/${customer.id}`}>
                                  <strong>{name}</strong>
                                </Link>
                                <small className="operations-meta">
                                  {customer.email}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td className="tabular-nums">
                            {customer.orderCount.toLocaleString(intlLocale)}
                          </td>
                          <td className="customer-revenue">
                            {formatPrice(customer.paidTotal, intlLocale)}
                          </td>
                          <td className="tabular-nums">
                            {customer.openOrders.toLocaleString(intlLocale)}
                          </td>
                          <td className="table-actions">
                            <Link
                              className="table-details-link"
                              href={`/customers/${customer.id}`}
                            >
                              {t("View details")}
                              <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {!data.data.customers.length && (
                      <EmptyTableRow columns={5} message="No customers found" />
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                pagination={data.data.pagination}
                disabled={data.isFetching || search !== view.query}
                onPageChange={page =>
                  setView(previous => ({ ...previous, page }))
                }
              />
            </>
          )}
        </QueryState>
      </div>
    </div>
  );
}
export function CustomerDetails({ id }: { id: string }) {
  const { t, intlLocale } = useI18n(),
    [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "customer", id, page],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof customerDetail>>>(
        `/api/admin/customers/${id}?page=${page}`,
        { signal }
      ),
  });
  const data = query.data;
  return (
    <div className="operations-page">
      <Link href="/customers">← {t("Customers")}</Link>
      <QueryState query={query}>
        {data && (
          <>
            <section className="admin-panel">
              <h2>{data.customer.name ?? t("Customer")}</h2>
              <p>{data.customer.email}</p>
              <p>
                {t("Joined")}: {formatDate(data.customer.createdAt, intlLocale)}
              </p>
              <div className="operations-stats">
                <div>
                  {t("Orders")}
                  <strong>{data.summary.total}</strong>
                </div>
                <div>
                  {t("Approved revenue")}
                  <strong>
                    {formatPrice(data.summary.paidTotal, intlLocale)}
                  </strong>
                </div>
                <div>
                  {t("Unfinished orders")}
                  <strong>{data.summary.openOrders}</strong>
                </div>
              </div>
            </section>
            <section className="admin-panel">
              <h2>{t("Purchase history")}</h2>
              {data.orders.length ? (
                data.orders.map(order => (
                  <Link
                    className="operations-row"
                    key={order.id}
                    href={`/orders/${order.id}`}
                  >
                    <strong>{t("Order #{id}", { id: order.id })}</strong>
                    <span>{t(adminStatusLabels[order.orderStatus])}</span>
                    <span>{formatOrderTotal(order, intlLocale)}</span>
                    <small>{formatDate(order.createdAt, intlLocale)}</small>
                  </Link>
                ))
              ) : (
                <p>{t("No orders found.")}</p>
              )}
            </section>
            <OperationsPager
              data={data}
              busy={query.isFetching}
              change={setPage}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
export function ActivityLog() {
  const { t, intlLocale } = useI18n(),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const data = useQuery({
    queryKey: ["admin", "activity", page, query],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof listActivity>>>(
        `/api/admin/activity?${new URLSearchParams({ page: String(page), query })}`,
        { signal }
      ),
    refetchInterval: 30000,
  });
  return (
    <div className="operations-page">
      <p>{t("Administrator actions recorded from this update onward.")}</p>
      <form
        className="page-actions"
        onSubmit={e => {
          e.preventDefault();
          setQuery(search);
          setPage(1);
        }}
      >
        <Input
          aria-label={t("Search activity")}
          value={search}
          maxLength={160}
          onChange={e => setSearch(e.target.value)}
        />
        <Button type="submit">{t("Search")}</Button>
      </form>
      <QueryState query={data}>
        {data.data && (
          <>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">{t("Activity log")}</caption>
                <thead>
                  <tr>
                    {["Date", "Administrator", "Action", "Record"].map(h => (
                      <th key={h}>{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.entries.length ? (
                    data.data.entries.map(e => (
                      <tr key={e.id}>
                        <td>{formatDate(e.createdAt, intlLocale)}</td>
                        <td>{e.actor ?? `#${e.actorId}`}</td>
                        <td>{t(e.action)}</td>
                        <td>{e.target}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>{t("No activity recorded")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <OperationsPager
              data={data.data}
              busy={data.isFetching}
              change={setPage}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
function reportDates() {
  const now = Date.now() + 6.5 * 3600000;
  return {
    from: new Date(now - 29 * 86400000).toISOString().slice(0, 10),
    to: new Date(now).toISOString().slice(0, 10),
  };
}
export function Reports() {
  const { t, intlLocale } = useI18n();
  const [dates, setDates] = useState(reportDates),
    [applied, setApplied] = useState(dates);
  const params = new URLSearchParams(applied).toString();
  const query = useQuery({
    queryKey: ["admin", "reports", applied],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof salesReport>>>(
        `/api/admin/reports?${params}`,
        { signal }
      ),
  });
  const report = query.data;
  return (
    <div className="operations-page">
      <p>
        {t(
          "Approved orders grouped by order date. Dates use Myanmar time (UTC+06:30)."
        )}
      </p>
      <form
        className="page-actions"
        onSubmit={e => {
          e.preventDefault();
          setApplied({ ...dates });
        }}
      >
        <label>
          {t("From")}
          <Input
            type="date"
            required
            value={dates.from}
            max={dates.to}
            onChange={e => setDates({ ...dates, from: e.target.value })}
          />
        </label>
        <label>
          {t("To")}
          <Input
            type="date"
            required
            min={dates.from}
            value={dates.to}
            onChange={e => setDates({ ...dates, to: e.target.value })}
          />
        </label>
        <Button type="submit">{t("Apply")}</Button>
        {report && (
          <a
            className="button button-secondary"
            href={`/api/admin/reports?${params}&format=csv`}
          >
            {t("Export CSV")}
          </a>
        )}
      </form>
      <QueryState query={query}>
        {report && (
          <>
            <div className="operations-stats">
              <div>
                {t("Approved revenue")}
                <strong>
                  {formatPrice(report.summary.revenue, intlLocale)}
                </strong>
              </div>
              <div>
                {t("Approved orders")}
                <strong>{report.summary.count}</strong>
              </div>
              <div>
                {t("Delivered")}
                <strong>{report.summary.delivered}</strong>
              </div>
            </div>
            <section className="admin-panel">
              <h2>{t("Daily sales")}</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Date")}</th>
                      <th>{t("Orders")}</th>
                      <th>{t("Approved revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.length ? (
                      report.daily.map(day => (
                        <tr key={day.day}>
                          <td>{day.day}</td>
                          <td>{day.count}</td>
                          <td>{formatPrice(day.revenue, intlLocale)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>
                          {t("No approved sales in this period")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="admin-panel">
              <h2>{t("Best-selling products")}</h2>
              <p>
                {t(
                  "Top 20 products by line revenue, before order-level discounts."
                )}
              </p>
              {report.bestsellers.map(p => (
                <div className="operations-row" key={p.productId}>
                  <strong>{p.title}</strong>
                  <span>
                    {t("Quantity")}: {p.quantity}
                  </span>
                  <span>{formatPrice(p.revenue, intlLocale)}</span>
                </div>
              ))}
              {!report.bestsellers.length && (
                <p>{t("No approved sales in this period")}</p>
              )}
            </section>
            <section className="admin-panel">
              <h2>{t("Sales by payment method")}</h2>
              {report.methods.map(m => (
                <div className="operations-row" key={m.method}>
                  <strong>{m.method}</strong>
                  <span>{m.count}</span>
                  <span>{formatPrice(m.revenue, intlLocale)}</span>
                </div>
              ))}
              {!report.methods.length && (
                <p>{t("No approved sales in this period")}</p>
              )}
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}
export function AdminOrderDetails({ id }: { id: string }) {
  const { t, intlLocale } = useI18n(),
    client = useQueryClient(),
    [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof adminOrderDetail>>>(
        `/api/admin/orders/${id}`,
        { signal }
      ),
    refetchInterval: 30000,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin"] }),
      client.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
    toast.success(t("Changes saved."));
  };
  const note = useMutation({
    mutationFn: () =>
      api(`/api/admin/orders/${id}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: async () => {
      setMessage("");
      await refresh();
    },
  });
  const complete = useMutation({
    mutationFn: () =>
      api(`/api/admin/orders/${id}/complete`, { method: "PATCH" }),
    onSuccess: refresh,
  });
  const review = useMutation({
    mutationFn: (input: {
      paymentId: number;
      status: "approved" | "rejected";
      rejectionReason?: string;
    }) =>
      api("/api/admin/payments", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const data = query.data;
  return (
    <div className="operations-page">
      <Link href="/orders">← {t("Orders")}</Link>
      <QueryState query={query}>
        {data && (
          <>
            <section className="admin-panel">
              <h2>{t("Order #{id}", { id: data.order.id })}</h2>
              <Link href={`/customers/${data.order.userId}`}>
                {data.order.customerName}
              </Link>
              <p>{data.order.customerEmail}</p>
              <p>{formatDate(data.order.createdAt, intlLocale)}</p>
              <p>
                {t(adminStatusLabels[data.order.orderStatus])} ·{" "}
                {formatOrderTotal(data.order, intlLocale)}
              </p>
              {data.order.completedAt && (
                <p>
                  {t("Delivered")}:{" "}
                  {formatDate(data.order.completedAt, intlLocale)} ·{" "}
                  {t("Administrator #{id}", {
                    id: data.order.completedBy ?? "—",
                  })}
                </p>
              )}
              {data.order.orderStatus === "paid" &&
                data.order.paymentStatus === "approved" && (
                  <ConfirmAction
                    title={t("Mark order #{id} as delivered?", {
                      id: data.order.id,
                    })}
                    description={t(
                      "Confirm that all products in this order have been delivered. The customer will be notified."
                    )}
                    actionLabel={t("Mark as delivered")}
                    onConfirm={async () => {
                      await complete.mutateAsync();
                    }}
                  >
                    <Button disabled={complete.isPending}>
                      {t("Mark as delivered")}
                    </Button>
                  </ConfirmAction>
                )}
            </section>
            <section className="admin-panel">
              <h2>{t("Products")}</h2>
              {data.items.map(item => (
                <div className="operations-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>
                    {formatOrderItem(item, data.order, intlLocale)} ×{" "}
                    {item.quantity}
                  </span>
                </div>
              ))}
              <p>
                {t("Subtotal")}: {formatOrderSubtotal(data.order, intlLocale)}
              </p>
              <p>
                {t("Discount")}: {formatOrderDiscount(data.order, intlLocale)}
              </p>
              <strong>
                {t("Total")}: {formatOrderTotal(data.order, intlLocale)}
              </strong>
            </section>
            <section className="admin-panel">
              <h2>{t("Payment history")}</h2>
              {data.evidence.length ? (
                data.evidence.map(payment => (
                  <PaymentRecord
                    key={payment.id}
                    payment={payment}
                    disabled={
                      review.isPending ||
                      data.order.paymentStatus === "approved"
                    }
                    review={input => review.mutate(input)}
                  />
                ))
              ) : (
                <p>{t("No payment evidence submitted")}</p>
              )}
            </section>
            <section className="admin-panel">
              <h2>{t("Internal order notes")}</h2>
              <p>{t("Visible to administrators only")}</p>
              {data.notes.map(n => (
                <article className="payment-history" key={n.id}>
                  <small>
                    {n.author} · {formatDate(n.createdAt, intlLocale)}
                  </small>
                  <p className="preserve-text">{n.body}</p>
                </article>
              ))}
              <form
                className="support-form"
                onSubmit={e => {
                  e.preventDefault();
                  note.mutate();
                }}
              >
                <label>
                  {t("Add note")}
                  <Textarea
                    required
                    maxLength={5000}
                    value={message}
                    disabled={note.isPending}
                    onChange={e => setMessage(e.target.value)}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={note.isPending || !message.trim()}
                >
                  {t(note.isPending ? "Saving…" : "Save note")}
                </Button>
              </form>
            </section>
          </>
        )}
      </QueryState>
    </div>
  );
}
function PaymentRecord({
  payment,
  disabled,
  review,
}: {
  payment: Awaited<ReturnType<typeof adminOrderDetail>>["evidence"][number];
  disabled: boolean;
  review: (input: {
    paymentId: number;
    status: "approved" | "rejected";
    rejectionReason?: string;
  }) => void;
}) {
  const { t, intlLocale } = useI18n(),
    [reason, setReason] = useState("");
  return (
    <article className="payment-history">
      <strong>
        {payment.paymentMethod} ·{" "}
        {formatPrice(
          payment.payableAmount ?? payment.amount,
          intlLocale,
          resolveCurrency(payment.currency)
        )}
      </strong>
      <p>
        {t(adminStatusLabels[payment.status])} ·{" "}
        {formatDate(payment.createdAt, intlLocale)}
      </p>
      <p>
        {payment.senderName} · {payment.senderPhone}
      </p>
      {payment.transactionReference && (
        <p>
          {t("Transaction reference")}: {payment.transactionReference}
        </p>
      )}
      {payment.verifiedAt && (
        <p>
          {t("Reviewed")}: {formatDate(payment.verifiedAt, intlLocale)} ·{" "}
          {t("Administrator #{id}", { id: payment.verifiedBy ?? "—" })}
        </p>
      )}
      {payment.rejectionReason && (
        <p className="error">{payment.rejectionReason}</p>
      )}
      <a
        className="button button-secondary"
        href={storageUrl(payment.screenshotKey)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("View payment evidence")}
      </a>
      {payment.status === "pending" && (
        <form
          className="support-form"
          onSubmit={e => {
            e.preventDefault();
            review({
              paymentId: payment.id,
              status: "rejected",
              rejectionReason: reason,
            });
          }}
        >
          <div className="page-actions">
            <Button
              type="button"
              disabled={disabled}
              onClick={() =>
                review({ paymentId: payment.id, status: "approved" })
              }
            >
              {t("Approve")}
            </Button>
          </div>
          <label>
            {t("Rejection reason")}
            <Textarea
              required
              minLength={2}
              maxLength={1000}
              value={reason}
              disabled={disabled}
              onChange={e => setReason(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            variant="destructive"
            disabled={disabled || reason.trim().length < 2}
          >
            {t("Reject")}
          </Button>
        </form>
      )}
    </article>
  );
}
