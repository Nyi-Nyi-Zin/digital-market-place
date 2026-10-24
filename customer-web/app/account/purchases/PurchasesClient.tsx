"use client";
import { Button } from "../../components/ui/button";

import { formatDate } from "@marketplace/shared/format";
import { useI18n } from "../../components/I18nProvider";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatPrice } from "@marketplace/shared/pricing";
import type { CustomerOrder } from "@marketplace/server/customer-orders";
export function PurchasesClient() {
  const { t, intlLocale } = useI18n();
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: CustomerOrder[] }>("/api/orders"),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!query.data || !/^#order-\d+$/.test(window.location.hash)) return;
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  }, [query.data]);
  if (query.isPending)
    return <p role="status">{t("Loading orders and purchases…")}</p>;
  if (query.error) return <p role="alert">{t(query.error.message)}</p>;
  return (
    <>
      <Button
        variant="brand"
        size="brand"
        className="button button-secondary"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
      >
        {t("Refresh order status")}
      </Button>
      {!query.data?.orders.length && (
        <div className="empty-panel">
          <h2>{t("No orders yet")}</h2>
          <Link href="/">{t("Browse products")}</Link>
        </div>
      )}
      {query.data?.orders.map(order => (
        <section
          className="account-panel"
          key={order.id}
          id={`order-${order.id}`}
          tabIndex={-1}
        >
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
          <p>
            <Link href={`/account/purchases/${order.id}`}>
              {t("View order details")}
            </Link>
          </p>
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
              <strong>
                {t(
                  order.orderStatus === "completed"
                    ? "Delivered"
                    : "Delivery pending"
                )}
              </strong>
              {order.completedAt && (
                <p>{formatDate(order.completedAt, intlLocale)}</p>
              )}
              <p>
                {order.orderStatus === "completed"
                  ? t(
                      "Your products for order #{orderId} have been delivered.",
                      { orderId: order.id }
                    )
                  : t(
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
