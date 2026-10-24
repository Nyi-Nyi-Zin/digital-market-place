"use client";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";

import { useI18n } from "../../components/I18nProvider";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
type Item = {
  product: {
    id: number;
    title: string;
    slug: string;
    shortDescription: string | null;
    status: string;
  };
};
export function WishlistClient() {
  const { t } = useI18n();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api<{ items: Item[] }>("/api/wishlist"),
  });
  const remove = useMutation({
    mutationFn: (productId: number) =>
      api("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ productId }),
      }),
    onSuccess: () => {
      toast.success(t("Removed from wishlist."));
      return client.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
  if (query.isPending) return <p role="status">{t("Loading wishlist…")}</p>;
  if (query.error) return <p role="alert">{t(query.error.message)}</p>;
  return (
    <>
      {query.data?.items.length ? (
        <div className="purchase-list">
          {query.data.items.map(({ product }) => (
            <article key={product.id}>
              <div>
                <strong>{product.title}</strong>
                <p>{product.shortDescription}</p>
                {product.status === "published" ? (
                  <Link href={`/products/${product.slug}`}>
                    {t("View product →")}
                  </Link>
                ) : (
                  <small>{t("This product is currently unavailable.")}</small>
                )}
              </div>
              <Button
                variant="brand"
                size="brand"
                className="button button-secondary"
                disabled={remove.isPending}
                onClick={() => remove.mutate(product.id)}
              >
                {t("Remove {title}", { title: product.title })}
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <h2>{t("Your wishlist is empty")}</h2>
          <Link href="/">{t("Browse products")}</Link>
        </div>
      )}
    </>
  );
}
