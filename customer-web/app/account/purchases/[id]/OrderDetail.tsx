"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { orderDetail } from "@marketplace/server/operations";
import { api } from "../../../lib/api";
import { useI18n } from "../../../components/I18nProvider";
import { Button } from "../../../components/ui/button";
import {
  formatPrice,
  formatOrderTotal,
  formatOrderItem,
  formatOrderSubtotal,
  formatOrderDiscount,
} from "@marketplace/shared/pricing";
import { resolveCurrency } from "@marketplace/shared/currency";
import { formatDate } from "@marketplace/shared/format";
import { adminStatusLabels } from "@marketplace/shared/pagination";

export function OrderDetail({ id }: { id: string }) {
  const { t, intlLocale } = useI18n();
  const query = useQuery({
    queryKey: ["order", id],
    queryFn: ({ signal }) =>
      api<Awaited<ReturnType<typeof orderDetail>>>(`/api/orders/${id}`, {
        signal,
      }),
    refetchInterval: 30000,
  });
  if (query.isPending) return <p role="status">{t("Loading order details")}</p>;
  if (query.error)
    return (
      <div role="alert">
        <p>{t(query.error.message)}</p>
        <Button onClick={() => query.refetch()}>{t("Try again")}</Button>
      </div>
    );
  const { order, items, payments } = query.data;
  const latest = payments[0];
  return (
    <>
      <div className="page-actions">
        <Link href="/account/purchases">← {t("My purchases")}</Link>
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          {t("Refresh order status")}
        </Button>
      </div>
      <section className="information-panel">
        <div className="section-heading">
          <h1>{t("Order #{id}", { id: order.id })}</h1>
          <span className={`pill ${order.orderStatus}`}>
            {t(adminStatusLabels[order.orderStatus])}
          </span>
        </div>
        <p>{formatDate(order.createdAt, intlLocale)}</p>
        <p>
          {order.customerName} · {order.customerEmail}
        </p>
        <ol className="order-progress" aria-label={t("Order progress")}>
          <li>{t("Order placed")}</li>
          <li
            aria-current={
              order.paymentStatus !== "approved" ? "step" : undefined
            }
          >
            {t(
              order.paymentStatus === "approved"
                ? "Payment approved"
                : order.paymentStatus === "rejected"
                  ? "Payment rejected"
                  : "Awaiting payment"
            )}
          </li>
          <li
            aria-current={
              order.paymentStatus === "approved" ? "step" : undefined
            }
          >
            {t(
              order.orderStatus === "completed"
                ? "Delivered"
                : "Delivery pending"
            )}
          </li>
        </ol>
        {order.completedAt && (
          <p>
            {t("Delivered")}: {formatDate(order.completedAt, intlLocale)}
          </p>
        )}
        {order.paymentStatus === "approved" &&
          order.orderStatus !== "completed" && (
            <p>
              {t(
                "After payment approval, your product will be delivered manually. Contact support with your order number if you need help."
              )}
            </p>
          )}
      </section>
      <section className="information-panel">
        <h2>{t("Products")}</h2>
        {items.map(item => (
          <div className="record-row" key={item.id}>
            <Link href={`/products/${item.slug}`}>{item.title}</Link>
            <span>
              {formatOrderItem(item, order, intlLocale)} × {item.quantity}
            </span>
          </div>
        ))}
        <p>
          {t("Subtotal")}: {formatOrderSubtotal(order, intlLocale)}
        </p>
        <p>
          {t("Discount")}: {formatOrderDiscount(order, intlLocale)}
        </p>
        <strong>
          {t("Total")}: {formatOrderTotal(order, intlLocale)}
        </strong>
      </section>
      <section className="information-panel">
        <h2>{t("Payment history")}</h2>
        {payments.length ? (
          payments.map(payment => (
            <article className="payment-history" key={payment.id}>
              <strong>
                {payment.method} ·{" "}
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
              {payment.reference && (
                <p>
                  {t("Transaction reference")}: {payment.reference}
                </p>
              )}
              {payment.verifiedAt && (
                <p>
                  {t("Reviewed")}: {formatDate(payment.verifiedAt, intlLocale)}
                </p>
              )}
              {payment.rejectionReason && (
                <p className="error">{payment.rejectionReason}</p>
              )}
            </article>
          ))
        ) : (
          <p>{t("No payment evidence submitted")}</p>
        )}
        {order.paymentStatus !== "approved" && latest?.status !== "pending" && (
          <Link
            className="button button-primary"
            href={`/checkout?order=${order.id}`}
          >
            {t(
              order.paymentStatus === "rejected"
                ? "Resubmit payment"
                : "Submit payment evidence"
            )}
          </Link>
        )}
        {latest?.status === "pending" && (
          <p>{t("Your payment is awaiting manual review.")}</p>
        )}
      </section>
      <Link
        className="button button-secondary"
        href={`/account/support?order=${order.id}`}
      >
        {t("Get help with this order")}
      </Link>
    </>
  );
}
