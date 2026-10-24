"use client";
import { toast } from "sonner";

import { Button } from "./ui/button";

import { useI18n } from "./I18nProvider";

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
    onSuccess: result => {
      toast.success(
        t(result.wished ? "Saved to wishlist" : "Removed from wishlist.")
      );
      return client.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
  return (
    <div>
      <Button
        variant="brand"
        size="brand"
        className="button button-secondary"
        aria-pressed={saved}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {saved ? t("Saved to wishlist") : t("Save to wishlist")}
      </Button>
    </div>
  );
}
