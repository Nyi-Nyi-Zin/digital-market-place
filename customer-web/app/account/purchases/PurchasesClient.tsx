"use client";
import { formatDate } from "@marketplace/shared/format";
import { useI18n } from "../../components/I18nProvider";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatPrice } from "@marketplace/shared/pricing";
import type { CustomerOrder } from "@marketplace/server/customer-orders";
export function PurchasesClient() {
  const { t, intlLocale } = useI18n();
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: CustomerOrder[] }>("/api/orders"),
  });
  if (query.isPending)
    return <p role="status">{t("Loading orders and purchases…")}</p>;
  if (query.error) return <p role="alert">{t(query.error.message)}</p>;
  return (
    <>
      <button
        className="button button-secondary"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
      >
        {t("Refresh order status")}
      </button>
      {!query.data?.orders.length && (
        <div className="empty-panel">
          <h2>{t("No orders yet")}</h2>
          <Link href="/">{t("Browse products")}</Link>
        </div>
      )}
      {query.data?.orders.map(order => (
        <section className="account-panel" key={order.id}>
          <div className="section-heading">
            <h2>
              {t("Order #{id}", { id: order.id })} ·{" "}
              {formatPrice(order.total, intlLocale)}
            </h2>
            <span className={`pill ${order.paymentStatus}`}>
              {t(order.paymentStatus)}
            </span>
          </div>
          <small>{formatDate(order.createdAt, intlLocale)}</small>
          {order.items.map(item => (
            <article className="record-row" key={item.id}>
              <div>
                <Link href={`/products/${item.slug}`}>
                  <strong>{item.titleSnapshot}</strong>
                </Link>
                <p>{formatPrice(item.unitPrice, intlLocale)}</p>
              </div>
            </article>
          ))}
          {order.paymentStatus === "approved" && (
            <div>
              <p>
                {t(
                  "After payment approval, your product will be delivered manually. Contact support with your order number if you need help."
                )}
              </p>
              <Link className="button button-secondary" href="/support">
                {t("Contact support")}
              </Link>
            </div>
          )}
          {order.latestPayment?.status === "rejected" && (
            <p className="error">
              {t("Payment rejected:")} {order.latestPayment.rejectionReason}
            </p>
          )}
          {order.paymentStatus !== "approved" &&
            (order.latestPayment?.status === "pending" ? (
              <p role="status">
                {t("Your payment is awaiting manual review.")}
              </p>
            ) : (
              <Link
                className="button button-primary"
                href={`/checkout?order=${order.id}`}
              >
                {order.paymentStatus === "rejected"
                  ? t("Resubmit payment")
                  : t("Submit payment evidence")}
              </Link>
            ))}
        </section>
      ))}
    </>
  );
}
