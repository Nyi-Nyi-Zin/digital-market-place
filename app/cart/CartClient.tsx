"use client";
import Link from "next/link";
import { useState } from "react";
import { type CartItem, readCart, writeCart, useCart } from "../lib/cart";
import { formatPrice } from "../lib/catalog";
export function AddToCartButton({
  item,
  buy = false,
}: {
  item: CartItem;
  buy?: boolean;
}) {
  const [added, setAdded] = useState(false);
  return (
    <button
      className={`button button-${buy ? "primary" : "secondary"}`}
      onClick={() => {
        const cart = readCart();
        if (!cart.some(x => x.id === item.id)) writeCart([...cart, item]);
        setAdded(true);
        if (buy) window.location.assign(`/checkout?buy=${item.id}`);
      }}
    >
      {buy ? "Buy now" : added ? "Added to cart" : "Add to cart"}
    </button>
  );
}
export function CartBadge() {
  const items = useCart();
  return (
    <Link className="cart-link" href="/cart">
      Cart <b>{items.length}</b>
    </Link>
  );
}
export function CartClient() {
  const items = useCart();
  return items.length ? (
    <div className="purchase-list">
      {items.map(item => (
        <article key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <p>{formatPrice(item.price)}</p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => writeCart(items.filter(x => x.id !== item.id))}
          >
            Remove {item.title}
          </button>
        </article>
      ))}
      <div className="cart-total">
        <strong>
          Estimated total:{" "}
          {formatPrice(items.reduce((sum, item) => sum + item.price, 0))}
        </strong>
        <p>Final prices are confirmed at checkout.</p>
        <Link className="button button-primary" href="/checkout">
          Continue to checkout
        </Link>
      </div>
    </div>
  ) : (
    <div className="empty-panel">
      <h2>Your cart is empty</h2>
      <Link className="button button-primary" href="/products">
        Browse products
      </Link>
    </div>
  );
}
