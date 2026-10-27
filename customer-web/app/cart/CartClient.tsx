"use client";
import { toast } from "sonner";
import { Button } from "../components/ui/button";

import { useI18n } from "../components/I18nProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  PackageOpen,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
} from "lucide-react";
import { type CartItem, readCart, writeCart, useCart } from "../lib/cart";
import { usePricing } from "../components/CurrencyProvider";
import {
  maxCartQuantity,
  multiplyAmount,
  sumAmounts,
} from "@marketplace/shared/currency";
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
    <Button
      variant="brand"
      size="brand"
      className={`button button-${buy ? "primary" : "secondary"}`}
      onClick={() => {
        const cart = readCart();
        const existing = cart.find(x => x.id === item.id);
        writeCart(
          existing
            ? cart.map(x =>
                x.id === item.id
                  ? {
                      ...x,
                      quantity: Math.min(
                        maxCartQuantity,
                        x.quantity + (buy ? 0 : 1)
                      ),
                    }
                  : x
              )
            : [...cart, { ...item, quantity: 1 }]
        );
        setAdded(true);
        if (!buy) toast.success(t("Added to cart"));
        if (buy) window.location.assign(`/checkout?buy=${item.id}`);
      }}
    >
      {buy ? t("Buy now") : added ? t("Added to cart") : t("Add to cart")}
    </Button>
  );
}
export function CartBadge() {
  const { t } = useI18n();
  const items = useCart();
  return (
    <Link className="cart-link" href="/cart">
      <ShoppingBag size={18} aria-hidden="true" />
      <span className="sr-only">{t("Cart")}</span>
      <b>{items.reduce((sum, item) => sum + item.quantity, 0)}</b>
    </Link>
  );
}
export function CartClient() {
  const { t, intlLocale } = useI18n();
  const { currency, convert } = usePricing();
  const items = useCart();
  const [ready, setReady] = useState(false);
  const browseLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => setReady(true), []);
  const total = formatPrice(
    sumAmounts(
      items.map(item => multiplyAmount(convert(item.price), item.quantity))
    ),
    intlLocale,
    currency
  );
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemCount = t(count === 1 ? "{count} item" : "{count} items", {
    count: new Intl.NumberFormat(intlLocale).format(count),
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
              </div>
              <div
                className="cart-quantity"
                role="group"
                aria-label={t("Quantity for {title}", { title: item.title })}
              >
                <Button
                  variant="brand"
                  size="brand"
                  type="button"
                  disabled={item.quantity <= 1}
                  aria-label={t("Decrease quantity for {title}", {
                    title: item.title,
                  })}
                  onClick={() =>
                    writeCart(
                      readCart().map(x =>
                        x.id === item.id
                          ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                          : x
                      )
                    )
                  }
                >
                  <Minus size={14} aria-hidden="true" />
                </Button>
                <output aria-live="polite">
                  {new Intl.NumberFormat(intlLocale).format(item.quantity)}
                </output>
                <Button
                  variant="brand"
                  size="brand"
                  type="button"
                  disabled={item.quantity >= maxCartQuantity}
                  aria-label={t("Increase quantity for {title}", {
                    title: item.title,
                  })}
                  onClick={() =>
                    writeCart(
                      readCart().map(x =>
                        x.id === item.id
                          ? {
                              ...x,
                              quantity: Math.min(
                                maxCartQuantity,
                                x.quantity + 1
                              ),
                            }
                          : x
                      )
                    )
                  }
                >
                  <Plus size={14} aria-hidden="true" />
                </Button>
              </div>
              <strong className="cart-item-price">
                {formatPrice(
                  multiplyAmount(convert(item.price), item.quantity),
                  intlLocale,
                  currency
                )}
              </strong>
              <Button
                variant="brand"
                size="brand"
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
                  toast.success(t("Removed from cart."));
                  if (nextButton) nextButton.focus();
                  else requestAnimationFrame(() => browseLink.current?.focus());
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                <span className="sr-only">{t("Remove")}</span>
              </Button>
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
              <dd>{total}</dd>
            </div>
            <div className="cart-estimate">
              <dt>{t("Estimated total")}</dt>
              <dd>{total}</dd>
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
