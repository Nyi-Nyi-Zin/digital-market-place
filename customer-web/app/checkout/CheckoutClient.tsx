"use client";
import { toast } from "sonner";
import { NativeSelect } from "../components/ui/native-select";

import { Button } from "../components/ui/button";

import { Input } from "../components/ui/input";

import { useI18n } from "../components/I18nProvider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useCart, readCart, writeCart } from "../lib/cart";
import { formatOrderTotal } from "@marketplace/shared/pricing";
import {
  resolveCurrency,
  type OrderPricing,
} from "@marketplace/shared/currency";
import { usePricing } from "../components/CurrencyProvider";
import type { CustomerOrder } from "@marketplace/server/customer-orders";
type Method = {
  id: number;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string | null;
  currency: string;
};
export function CheckoutClient({
  customer,
  orderId,
  buyId,
}: {
  customer: { name: string; email: string };
  orderId?: number;
  buyId?: number;
}) {
  const { t, intlLocale } = useI18n();
  const { currency, config, price, changingCurrency } = usePricing();
  const cart = useCart();
  const items = buyId ? cart.filter(x => x.id === buyId) : cart;
  const methods = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api<{ methods: Method[] }>("/api/payment-methods"),
  });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<{ orders: CustomerOrder[] }>("/api/orders"),
    enabled: Boolean(orderId),
  });
  const [order, setOrder] = useState<
    | (OrderPricing & {
        id: number;
        total: string;
        productIds: number[];
      })
    | null
  >(null);
  const [method, setMethod] = useState("");
  const [pending, setPending] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File>();
  const existing = orders.data?.orders.find(o => o.id === orderId);
  useEffect(() => {
    if (existing)
      setOrder({
        id: existing.id,
        total: existing.total,
        currency: existing.currency,
        exchangeRate: existing.exchangeRate,
        payableTotal: existing.payableTotal,
        productIds: existing.items.map(i => i.productId),
      });
  }, [existing]);
  const paymentCurrency = order ? resolveCurrency(order.currency) : currency;
  const availableMethods =
    methods.data?.methods.filter(m => m.currency === paymentCurrency) ?? [];
  const selected =
    availableMethods.find(m => m.name === method) ?? availableMethods[0];
  const awaiting = existing?.latestPayment?.status === "pending";
  if (submitted || awaiting)
    return (
      <div className="empty-panel" role="status">
        <h2>{t("Payment is awaiting review")}</h2>
        <p>
          {t(
            "Your order stays pending until an administrator verifies the payment."
          )}
        </p>
        <Link className="button button-primary" href="/account/purchases">
          {t("View order status")}
        </Link>
      </div>
    );
  if (existing?.paymentStatus === "approved")
    return (
      <div className="empty-panel">
        <h2>{t("Your payment is approved")}</h2>
        <Link href="/account/purchases">{t("Go to purchases")}</Link>
      </div>
    );
  if (orderId && orders.isPending)
    return <p role="status">{t("Loading order…")}</p>;
  if (orderId && (orders.error || (!orders.isPending && !existing)))
    return <p role="alert">{t(orders.error?.message ?? "Order not found")}</p>;
  return (
    <div className="checkout-grid">
      <section>
        {existing?.latestPayment?.rejectionReason && (
          <p className="error">
            {t("Previous payment rejected:")}{" "}
            {existing.latestPayment.rejectionReason}
            {t(". You can submit new evidence below.")}
          </p>
        )}
        {!order ? (
          <form
            className="account-form"
            onSubmit={async e => {
              e.preventDefault();
              setPending(true);

              const data = new FormData(e.currentTarget);
              try {
                const result = await api<OrderPricing & { orderId: number }>(
                  "/api/orders",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      customerName: data.get("name"),
                      customerEmail: data.get("email"),
                      currency,
                      items: items.map(item => ({
                        productId: item.id,
                        quantity: 1,
                      })),
                    }),
                  }
                );
                setOrder({
                  id: result.orderId,
                  total: result.total,
                  currency: result.currency,
                  exchangeRate: result.exchangeRate,
                  payableTotal: result.payableTotal,
                  productIds: items.map(i => i.id),
                });
                toast.success(t("Order created."));
                window.history.replaceState(
                  null,
                  "",
                  `/checkout?order=${result.orderId}`
                );
              } catch (e) {
                toast.error(t((e as Error).message), { id: "operation-error" });
              } finally {
                setPending(false);
              }
            }}
          >
            <h2>{t("1. Customer details")}</h2>
            <label>
              {t("Full name")}
              <Input
                name="name"
                defaultValue={customer.name}
                required
                minLength={2}
              />
            </label>
            <label>
              {t("Email address")}
              <Input
                name="email"
                type="email"
                defaultValue={customer.email}
                required
              />
            </label>
            <h2>{t("Order summary")}</h2>
            {items.map(item => (
              <p key={item.id}>
                {item.title} · {price(item.price)}
              </p>
            ))}
            {!items.length && (
              <p>
                {t("Your cart is empty.")}{" "}
                <Link href="/">{t("Browse products")}</Link>
              </p>
            )}
            <Button
              variant="brand"
              size="brand"
              className="button button-primary"
              disabled={
                pending ||
                changingCurrency ||
                !items.length ||
                !availableMethods.length
              }
            >
              {pending
                ? t("Creating order…")
                : t("Create order and confirm total")}
            </Button>
          </form>
        ) : (
          <form
            className="account-form"
            onSubmit={async e => {
              e.preventDefault();
              setPending(true);

              const data = new FormData(e.currentTarget);
              try {
                if (!file || !selected)
                  throw new Error("Select a payment method and screenshot");
                if (
                  file.size > 5 * 1024 * 1024 ||
                  !["image/jpeg", "image/png", "image/webp"].includes(file.type)
                )
                  throw new Error(
                    "Choose a JPG, PNG, or WEBP image up to 5 MB"
                  );
                const screenshotData = await new Promise<string>(
                  (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () =>
                      reject(new Error("Cannot read screenshot"));
                    reader.readAsDataURL(file);
                  }
                );
                await api("/api/payments/submit", {
                  method: "POST",
                  body: JSON.stringify({
                    orderId: order.id,
                    paymentMethod: selected.name,
                    senderName: data.get("senderName"),
                    senderPhone: data.get("senderPhone"),
                    transactionReference: data.get("transactionReference"),
                    screenshotContentType: file.type,
                    screenshotData,
                  }),
                });
                writeCart(
                  readCart().filter(item => !order.productIds.includes(item.id))
                );
                setSubmitted(true);
                toast.success(t("Payment is awaiting review"));
              } catch (e) {
                toast.error(t((e as Error).message), { id: "operation-error" });
              } finally {
                setPending(false);
              }
            }}
          >
            <h2>
              {t("Order #{id}", { id: order.id })} ·{" "}
              {formatOrderTotal(order, intlLocale)}
            </h2>
            <h3>{t("2. Make your transfer")}</h3>
            {order.currency !== config.baseCurrency && (
              <p>
                {t("Confirmed exchange rate: 1 {base} = {rate} {currency}", {
                  base: config.baseCurrency,
                  rate: String(Number(order.exchangeRate)),
                  currency: order.currency,
                })}
              </p>
            )}
            <p>
              {t(
                "Pay the confirmed amount to the selected account, then upload the payment screenshot."
              )}
            </p>
            <label>
              {t("Payment method")}
              <NativeSelect
                aria-label={t("Payment method")}
                value={selected?.name ?? ""}
                onChange={e => setMethod(e.target.value)}
              >
                {availableMethods.map(m => (
                  <option key={m.id}>{m.name}</option>
                ))}
              </NativeSelect>
            </label>
            {selected && (
              <div className="payment-detail">
                <strong>{selected.accountName}</strong>
                <p>{selected.accountNumber}</p>
                <small>{selected.instructions}</small>
              </div>
            )}
            <h3>{t("3. Submit payment evidence")}</h3>
            <label>
              {t("Sender name")}
              <Input
                name="senderName"
                defaultValue={customer.name}
                required
                minLength={2}
              />
            </label>
            <label>
              {t("Sender phone")}
              <Input name="senderPhone" type="tel" required minLength={5} />
            </label>
            <label>
              {t("Transaction reference")}
              <Input name="transactionReference" maxLength={120} />
            </label>
            <label>
              {t("Payment screenshot")}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={e => setFile(e.target.files?.[0])}
              />
            </label>
            <small>{t("JPG, PNG, or WEBP · up to 5 MB")}</small>
            <Button
              variant="brand"
              size="brand"
              className="button button-primary"
              disabled={pending || !selected}
            >
              {pending ? t("Submitting…") : t("Submit payment")}
            </Button>
          </form>
        )}
      </section>
      <aside>
        <h2>{t("Payment and delivery")}</h2>
        <p>
          {t(
            "Your final order total is confirmed before you transfer any money."
          )}
        </p>
        <p>{t("Products are delivered manually after payment approval.")}</p>
        {methods.isPending ? (
          <p role="status">{t("Loading payment accounts…")}</p>
        ) : methods.error ? (
          <p role="alert">{t(methods.error.message)}</p>
        ) : !availableMethods.length ? (
          <p role="alert">
            {t(
              "No payment account is available for {currency}. Please contact support.",
              { currency: paymentCurrency }
            )}
          </p>
        ) : (
          <p>
            {t("Available:")} {availableMethods.map(m => m.name).join(", ")}
          </p>
        )}
      </aside>
    </div>
  );
}
