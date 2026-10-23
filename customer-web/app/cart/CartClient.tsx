"use client";
import { useI18n } from "../components/I18nProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  PackageOpen,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { type CartItem, readCart, writeCart, useCart } from "../lib/cart";
import { formatPrice } from "@marketplace/shared/pricing";
export function AddToCartButton({
  item,
  buy = false,
}: {
  item: CartItem;
  buy?: boolean;
}) {
  const { t } = useI18n();
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
      {buy ? t("Buy now") : added ? t("Added to cart") : t("Add to cart")}
    </button>
  );
}
export function CartBadge() {
  const { t } = useI18n();
  const items = useCart();
  return (
    <Link className="cart-link" href="/cart">
      <ShoppingBag size={18} aria-hidden="true" />
      <span className="sr-only">{t("Cart")}</span>
      <b>{items.length}</b>
    </Link>
  );
}
export function CartClient() {
  const { t, intlLocale } = useI18n();
  const items = useCart();
  const [ready, setReady] = useState(false);
  const browseLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => setReady(true), []);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = t(items.length === 1 ? "{count} item" : "{count} items", {
    count: new Intl.NumberFormat(intlLocale).format(items.length),
  });

  if (!ready)
    return (
      <div className="cart-loading" role="status">
        <ShoppingBag size={20} aria-hidden="true" />
        {t("Loading your cart…")}
      </div>
    );

  return items.length ? (
    <div className="cart-layout">
      <section className="cart-products" aria-labelledby="cart-products-title">
        <div className="cart-products-heading">
          <h2 id="cart-products-title">{t("Products")}</h2>
          <span className="cart-count" role="status" aria-atomic="true">
            {itemCount}
          </span>
        </div>
        <ul className="cart-items">
          {items.map(item => (
            <li key={item.id} className="cart-item">
              <div className="cart-item-icon" aria-hidden="true">
                <PackageOpen size={26} strokeWidth={1.5} />
              </div>
              <div className="cart-item-copy">
                <h3>{item.title}</h3>
                <p>{t("Digital product")}</p>
              </div>
              <strong className="cart-item-price">
                {formatPrice(item.price, intlLocale)}
              </strong>
              <button
                type="button"
                className="cart-remove"
                aria-label={t("Remove {title}", { title: item.title })}
                onClick={event => {
                  const row = event.currentTarget.closest("li");
                  const adjacent =
                    row?.nextElementSibling ?? row?.previousElementSibling;
                  const nextButton =
                    adjacent?.querySelector<HTMLButtonElement>(".cart-remove");
                  writeCart(readCart().filter(x => x.id !== item.id));
                  if (nextButton) nextButton.focus();
                  else requestAnimationFrame(() => browseLink.current?.focus());
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                {t("Remove")}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <div className="cart-summary-card">
          <h2 id="cart-summary-title">{t("Order summary")}</h2>
          <dl className="cart-totals">
            <div className="cart-subtotal">
              <dt>
                {t("Subtotal")} <span>({itemCount})</span>
              </dt>
              <dd>{formatPrice(total, intlLocale)}</dd>
            </div>
            <div className="cart-estimate">
              <dt>{t("Estimated total")}</dt>
              <dd>{formatPrice(total, intlLocale)}</dd>
            </div>
          </dl>
          <p className="cart-price-note">
            {t("Final prices are confirmed at checkout.")}
          </p>
          <Link
            className="button button-primary cart-checkout"
            href="/checkout"
          >
            {t("Continue to checkout")}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="cart-delivery-note">
          <ShieldCheck size={19} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <strong>{t("Reviewed payments")}</strong>
            <p>
              {t("Products are delivered manually after payment approval.")}
            </p>
          </div>
        </div>
      </aside>
    </div>
  ) : (
    <div className="cart-empty">
      <div className="cart-empty-icon">
        <ShoppingBag size={34} strokeWidth={1.4} aria-hidden="true" />
      </div>
      <h2>{t("Your cart is empty")}</h2>
      <p>
        {t("Explore the library and find something for your next project.")}
      </p>
      <Link ref={browseLink} className="button button-primary" href="/">
        {t("Browse products")}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
