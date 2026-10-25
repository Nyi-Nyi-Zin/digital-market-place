# USD / SGD / MMK verification

Date: 2026-10-25 (Asia/Rangoon)

## Behavior

- Product entry and reporting retain the existing USD base currency. Admin store settings save manual SGD/MMK rates per USD with revision conflict protection. Blank rates disable new selections and orders for that currency.
- The customer header saves the chosen currency in a cookie. Product cards, featured products, product detail and cart convert from base prices. Price filters apply to rounded converted prices and clear when switching currency.
- Checkout uses the server's current product prices and rate, rounds each item, then sums the rounded amounts. USD/SGD use two decimal places; MMK uses whole kyat.
- Orders snapshot their currency, rate, payable total and item prices. Payment evidence snapshots the payable amount and currency. Changing or clearing rates does not reprice existing orders.
- Each payment account has a currency. Checkout offers matching accounts; the server rejects evidence submitted against a different currency before storing the screenshot.
- Customer and admin order/payment screens show the recorded currency and amount. Revenue reports continue to aggregate base amounts.
- Migration `drizzle/postgres/0004_multi_currency.sql` adds columns without rewriting existing monetary amounts. Existing USD records fall back to their original totals with exchange rate 1.

## Code and database evidence

- Root, customer and admin TypeScript checks passed.
- App/package boundary and git whitespace checks passed.
- Full isolated PostgreSQL test run: **24 files, 185 tests passed**. The temporary integration database was removed.
- New coverage checks supported/unsupported currencies, disabled rates, rate validation, exact decimal rounding, item/total consistency, legacy formatting, admin persistence, frozen order amounts, client amount/rate tampering, matching payment accounts, base-currency revenue and converted-price filtering.
- Migration applied successfully to the configured local database at `127.0.0.1:5432/digitalmarketplace`. No exchange rates were entered into the actual store.
- React review: server data access stays on the server, only serializable currency config crosses the provider boundary, controls have labels and pending states, and currency changes refresh server content while preserving cart base prices.

## Browser evidence

Browser verification passed in a copied-source preview backed by a disposable PostgreSQL database. Fixture accounts, rates and orders were separate from the actual local store. Temporary preview servers and their databases were removed.

- Admin saved SGD/MMK rates through the authenticated UI/API; SQL confirmed persistence.
- Unconfigured currencies were disabled. SGD selection survived reload and showed matching product/detail/cart amounts. Switching to MMK cleared price filters and displayed whole-kyat prices.
- Customer controls fit 320, 390, 768, 1024, 1101 and 1440px across five locales and both themes. Locale checks used full navigation and actual `html[lang]` assertions. Myanmar light/dark mobile screenshots were opened and inspected.
- Customer checkout created a real fixture order via HTTP 201. SQL confirmed base total `9.99`, currency `MMK`, rate `4200`, and payable total `41958.00`. Only the matching MMK account was offered.
- After admin changed the fixture rate to `5000`, checkout reload, customer order detail and admin order detail all retained `MMK 41,958`.
- No browser page exceptions occurred. The initial checkout assertion was corrected to wait for payment accounts to finish loading; the focused checkout rerun passed.

Evidence: `tmp/currency-qa/results.json`, `responsive-results.json`, `admin-rates-desktop.png`, `my-light-320.png`, `my-dark-320.png`, and `checkout-confirmed-mmk.png`. Test rates are examples only; they were not saved to the actual store.

## Limits

No production deployment, real-device QA, live payment transfer or live Cloudinary upload was performed. Payment evidence integration tests mock storage. The store owner must enter actual rates in **Admin > Store settings > Exchange rates** and assign the correct currency to each payment account in **Payment settings**.
