"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { useI18n } from "./I18nProvider";
import { formatDate } from "@marketplace/shared/format";
import type { DeliveryFailure } from "@marketplace/shared/notifications";
export function NotificationDeliveries() {
  const { t, intlLocale } = useI18n();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["notification-deliveries", page],
    queryFn: ({ signal }) =>
      api<{ deliveries: DeliveryFailure[]; pages: number; total: number }>(
        `/api/admin/notification-deliveries?page=${page}`,
        { signal }
      ),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const retry = useMutation({
    mutationFn: (id: number) =>
      api("/api/admin/notification-deliveries", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["notification-deliveries"] });
      toast.success(t("Delivery queued for retry."));
    },
  });
  useEffect(() => {
    if (query.data && page > query.data.pages) setPage(query.data.pages);
  }, [query.data, page]);
  return (
    <section
      className="notification-deliveries"
      aria-label={t("Failed deliveries")}
    >
      <h2>{t("Failed deliveries")}</h2>
      {query.isPending ? (
        <p role="status">{t("Loading…")}</p>
      ) : query.error ? (
        <div role="alert">
          <p>{t(query.error.message)}</p>
          <Button
            variant="brand"
            size="brand"
            className="notification-control"
            onClick={() => query.refetch()}
          >
            {t("Try again")}
          </Button>
        </div>
      ) : !query.data?.deliveries.length ? (
        <p>{t("No failed deliveries.")}</p>
      ) : (
        <ul className="notification-list">
          {query.data.deliveries.map(delivery => (
            <li className="notification-item" key={delivery.id}>
              <div className="notification-item-main">
                <strong>
                  {t(
                    delivery.channel === "email"
                      ? "Email notifications"
                      : "Push notifications"
                  )}{" "}
                  · #{delivery.notificationId}
                </strong>
                <p>
                  {t(delivery.lastError ?? "Delivery temporarily unavailable")}
                </p>
                <small>
                  {t(delivery.audience === "admin" ? "Admin" : "Customer")} ·{" "}
                  {t("Attempts: {count}", { count: delivery.attempts })} ·{" "}
                  {formatDate(delivery.createdAt, intlLocale)}
                </small>
              </div>
              <Button
                variant="brand"
                size="brand"
                className="notification-control"
                disabled={retry.isPending}
                onClick={() => retry.mutate(delivery.id)}
              >
                {t("Retry delivery")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {query.data && query.data.pages > 1 && (
        <nav className="notification-pagination" aria-label={t("Pagination")}>
          <Button
            variant="brand"
            size="brand"
            className="notification-control"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            {t("Previous")}
          </Button>
          <span>
            {t("Page {page} of {pages}", { page, pages: query.data.pages })}
          </span>
          <Button
            variant="brand"
            size="brand"
            className="notification-control"
            disabled={page >= query.data.pages}
            onClick={() => setPage(p => p + 1)}
          >
            {t("Next")}
          </Button>
        </nav>
      )}
    </section>
  );
}
