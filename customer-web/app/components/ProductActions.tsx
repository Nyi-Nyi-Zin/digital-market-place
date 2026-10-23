"use client";
import { formatDate } from "@marketplace/shared/format";
import { useI18n } from "./I18nProvider";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
export function WishlistButton({ productId }: { productId: number }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const session = authClient.useSession();
  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: () =>
      api<{ items: { product: { id: number } }[] }>("/api/wishlist"),
    enabled: Boolean(session.data),
  });
  const saved =
    query.data?.items.some(item => item.product.id === productId) ?? false;
  const mutation = useMutation({
    mutationFn: () =>
      api<{ wished: boolean }>("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["wishlist"] }),
  });
  return (
    <div>
      <button
        className="button button-secondary"
        aria-pressed={saved}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {saved ? t("Saved to wishlist") : t("Save to wishlist")}
      </button>
      {mutation.error && <p role="alert">{t(mutation.error.message)}</p>}
    </div>
  );
}
type Review = {
  id: number;
  name: string | null;
  rating: number;
  body: string | null;
  createdAt: string;
};
export function ProductReviews({ productId }: { productId: number }) {
  const { t, intlLocale } = useI18n();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () =>
      api<{ reviews: Review[] }>(`/api/reviews?productId=${productId}`),
  });
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      api("/api/reviews", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      setMessage("Your review has been saved.");
      client.invalidateQueries({ queryKey: ["reviews", productId] });
    },
  });
  return (
    <section className="account-panel">
      <h2>{t("Customer reviews")}</h2>
      {query.isPending ? (
        <p>{t("Loading reviews…")}</p>
      ) : query.error ? (
        <p role="alert">{t(query.error.message)}</p>
      ) : query.data?.reviews.length ? (
        query.data.reviews.map(review => (
          <article key={review.id} className="record-row">
            <div>
              <strong>
                {review.name ?? "Customer"} · {review.rating}/5
              </strong>
              <p>{review.body}</p>
            </div>
            <small>{formatDate(review.createdAt, intlLocale, false)}</small>
          </article>
        ))
      ) : (
        <p>{t("No reviews yet.")}</p>
      )}
      <details>
        <summary>{t("Write or update a review")}</summary>
        <p>{t("Reviews are available to verified buyers.")}</p>
        <form
          className="account-form"
          onSubmit={e => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            mutation.mutate({
              productId,
              rating: Number(data.get("rating")),
              body: data.get("body"),
            });
          }}
        >
          <label>
            {t("Your rating")}
            <select aria-label={t("Your rating")} name="rating">
              <option value="5">{t("5 stars")}</option>
              <option value="4">{t("4 stars")}</option>
              <option value="3">{t("3 stars")}</option>
              <option value="2">{t("2 stars")}</option>
              <option value="1">{t("1 star")}</option>
            </select>
          </label>
          <label>
            {t("Your review")}
            <textarea
              aria-label={t("Your review")}
              name="body"
              required
              minLength={2}
              maxLength={2000}
            />
          </label>
          <button
            className="button button-primary"
            disabled={mutation.isPending}
          >
            {t("Save review")}
          </button>
          {mutation.error && <p role="alert">{t(mutation.error.message)}</p>}
          {message && <p role="status">{t(message)}</p>}
        </form>
      </details>
    </section>
  );
}
