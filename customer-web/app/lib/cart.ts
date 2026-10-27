"use client";
import { useEffect, useState } from "react";
import { maxCartQuantity } from "@marketplace/shared/currency";
export type CartItem = {
  id: number;
  title: string;
  price: number;
  quantity?: number;
};
export type CartLine = CartItem & { quantity: number };
export function readCart(): CartLine[] {
  try {
    const stored = JSON.parse(localStorage.getItem("marketplace-cart") ?? "[]");
    return Array.isArray(stored)
      ? stored
          .filter(
            (x: CartItem) =>
              Number.isInteger(x?.id) &&
              x.id > 0 &&
              typeof x.title === "string" &&
              Number.isFinite(x.price) &&
              x.price >= 0
          )
          .map((x: CartItem) => ({
            ...x,
            quantity: Number.isInteger(x.quantity)
              ? Math.max(1, Math.min(maxCartQuantity, x.quantity!))
              : 1,
          }))
      : [];
  } catch {
    return [];
  }
}
export function writeCart(items: CartItem[]) {
  localStorage.setItem("marketplace-cart", JSON.stringify(items));
  window.dispatchEvent(new Event("marketplace-cart"));
}
export function useCart() {
  const [items, setItems] = useState<CartLine[]>([]);
  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener("marketplace-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("marketplace-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return items;
}
