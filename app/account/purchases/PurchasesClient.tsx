"use client";

import { useEffect, useState } from "react";

export function PurchasesClient() {
  const [state, setState] = useState<{ loading: boolean; error?: string; purchases: any[] }>({ loading: true, purchases: [] });
  useEffect(() => { fetch("/api/orders").then(async response => { if (!response.ok) throw new Error(response.status === 401 ? "Sign in to view your approved purchases." : "Unable to load purchases."); return response.json(); }).then(data => setState({ loading: false, purchases: data.purchases ?? [] })).catch(error => setState({ loading: false, purchases: [], error: error.message })); }, []);
  if (state.loading) return <p className="loading-copy">Loading your purchase library…</p>;
  if (state.error) return <div className="empty-panel"><h2>{state.error}</h2><p>Your approved digital products and secure download history appear here after sign-in.</p></div>;
  if (!state.purchases.length) return <div className="empty-panel"><h2>No approved purchases yet.</h2><p>Once payment is verified, secure downloads will appear here.</p></div>;
  return <div className="purchase-list">{state.purchases.map(({ order, product, download }) => <article key={`${order.id}-${product.id}`}><div><strong>{product.title}</strong><p>Order #{order.id} · {order.paymentStatus}</p></div><div><span>{download?.downloadCount ?? 0} downloads</span><button className="button button-primary" onClick={async () => { const response = await fetch(`/api/download/${product.id}`, { method: "POST" }); const data = await response.json(); if (data.url) window.open(data.url, "_blank"); }}>Download</button></div></article>)}</div>;
}
