"use client";

import { useEffect, useState } from "react";

type Method = { id?: number; name: string; accountName?: string | null; accountNumber?: string | null; instructions?: string | null };

export function CheckoutClient() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [selected, setSelected] = useState<Method | null>(null);
  const [status, setStatus] = useState("Loading available payment methods…");
  useEffect(() => { fetch("/api/payment-methods").then(r => r.ok ? r.json() : Promise.reject()).then(data => { setMethods(data.methods ?? []); setSelected(data.methods?.[0] ?? null); setStatus(""); }).catch(() => setStatus("Payment methods are temporarily unavailable. Please try again.")); }, []);
  return <div className="checkout-grid"><section><h2>1. Customer details</h2><input placeholder="Full name" /><input placeholder="Email address" /><h2>2. Select a payment method</h2>{status ? <p>{status}</p> : <div className="payment-options">{methods.map(method => <button key={method.id ?? method.name} className={selected?.name === method.name ? "selected-payment" : ""} onClick={() => setSelected(method)}>{method.name}</button>)}</div>}{selected ? <div className="payment-detail"><strong>{selected.name}</strong><p>{selected.accountName} · {selected.accountNumber}</p><small>{selected.instructions}</small></div> : null}</section><aside><h2>Payment confirmation</h2><p>After payment, upload a JPG, PNG, or WEBP screenshot up to 5 MB along with sender information and your transaction reference. Your order stays pending until an administrator verifies it.</p><button className="button button-primary">Continue to payment details</button></aside></div>;
}
