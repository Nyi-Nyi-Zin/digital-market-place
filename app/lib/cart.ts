"use client";
import { useEffect, useState } from "react";
export type CartItem = { id: number; title: string; price: number };
export function readCart(): CartItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem("marketplace-cart") ?? "[]");
    return Array.isArray(stored)
      ? stored.filter(
          (x: CartItem) =>
            Number.isInteger(x?.id) &&
            x.id > 0 &&
            typeof x.title === "string" &&
            Number.isFinite(x.price)
        )
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
  const [items, setItems] = useState<CartItem[]>([]);
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
