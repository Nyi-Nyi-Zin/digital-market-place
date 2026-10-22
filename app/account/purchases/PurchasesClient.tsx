"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatPrice } from "../../lib/catalog";
import type { CustomerOrder } from "../../../server/customer-orders";
export function PurchasesClient() {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number>();
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: CustomerOrder[] }>("/api/orders"),
  });
  if (query.isPending)
    return <p role="status">Loading orders and purchases…</p>;
  if (query.error) return <p role="alert">{query.error.message}</p>;
  return (
    <>
      <button
        className="button button-secondary"
        onClick={() => query.refetch()}
        disabled={query.isFetching}
      >
        Refresh order status
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!query.data?.orders.length && (
        <div className="empty-panel">
          <h2>No orders yet</h2>
          <Link href="/products">Browse products</Link>
        </div>
      )}
      {query.data?.orders.map(order => (
        <section className="admin-panel" key={order.id}>
          <div className="section-heading">
            <h2>
              Order #{order.id} · {formatPrice(order.total)}
            </h2>
            <span className={`pill ${order.paymentStatus}`}>
              {order.paymentStatus}
            </span>
          </div>
          <small>{new Date(order.createdAt).toLocaleString()}</small>
          {order.items.map(item => (
            <article className="record-row" key={item.id}>
              <div>
                <Link href={`/products/${item.slug}`}>
                  <strong>{item.titleSnapshot}</strong>
                </Link>
                <p>
                  {formatPrice(item.unitPrice)} ·{" "}
                  {item.download?.downloadCount ?? 0} downloads
                </p>
                {item.download?.lastDownloadedAt && (
                  <small>
                    Last download:{" "}
                    {new Date(item.download.lastDownloadedAt).toLocaleString()}
                  </small>
                )}
              </div>
              {order.paymentStatus === "approved" && (
                <button
                  className="button button-primary"
                  disabled={busy !== undefined}
                  onClick={async () => {
                    const tab = window.open("about:blank", "_blank");
                    if (tab) tab.opener = null;
                    setBusy(item.productId);
                    setError("");
                    try {
                      const result = await api<{ url: string }>(
                        `/api/download/${item.productId}`,
                        { method: "POST" }
                      );
                      if (tab) tab.location.href = result.url;
                      else window.location.assign(result.url);
                      await client.invalidateQueries({ queryKey: ["orders"] });
                    } catch (e) {
                      tab?.close();
                      setError((e as Error).message);
                    } finally {
                      setBusy(undefined);
                    }
                  }}
                >
                  {busy === item.productId
                    ? "Preparing…"
                    : `Download ${item.titleSnapshot}`}
                </button>
              )}
            </article>
          ))}
          {order.latestPayment?.status === "rejected" && (
            <p className="error">
              Payment rejected: {order.latestPayment.rejectionReason}
            </p>
          )}
          {order.paymentStatus !== "approved" &&
            (order.latestPayment?.status === "pending" ? (
              <p role="status">Your payment is awaiting manual review.</p>
            ) : (
              <Link
                className="button button-primary"
                href={`/checkout?order=${order.id}`}
              >
                {order.paymentStatus === "rejected"
                  ? "Resubmit payment"
                  : "Submit payment evidence"}
              </Link>
            ))}
        </section>
      ))}
    </>
  );
}
