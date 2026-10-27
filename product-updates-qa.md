# Product currency, featured rotation and cart quantity

Verified locally on 2026-10-27 (Asia/Rangoon).

## Result

- Product creation and editing accept USD, SGD or MMK entry prices. The server converts regular and discount prices using configured store rates and stores one base price. Existing products reopen in the base currency. Unsupported or unconfigured currencies are rejected; unavailable choices are disabled in the form. Actual exchange rates must be entered in Admin > Store settings.
- Featured products advance every five seconds while the pointer or focus remains inside the banner. Pause/Resume, direct navigation, hidden-tab suspension and reduced-motion preferences remain supported. The timer depends on product count instead of the products array reference.
- Product cards no longer show the Digital product badge. Cart rows also omit that label. Home cards hide descriptions, as requested; the featured banner retains its description.
- Cart quantity controls support 1–99 units. Line totals, item counts, header badge and checkout reflect quantities. Existing stored carts default to one unit, and changes persist across reloads and synchronize between tabs.
- Checkout validates quantities server-side, rejects duplicate product lines and calculates totals from current database prices. Converted unit prices are rounded before multiplication. Orders retain quantities and the confirmed currency/rate/amounts. Manual payment review and fulfillment remain unchanged.

## Checks

- `npm run check` passed: route generation, root/customer/admin TypeScript, app boundaries and compilation of 19 Tailwind stylesheets.
- Full isolated PostgreSQL suite: **24 test files, 193 tests passed**. Added coverage includes reverse currency conversion, converted discounts and overflow, quantity limits, persisted order quantities and per-unit currency rounding.
- Final changed TypeScript files passed checks; formatting and `git diff --check` passed. Tailwind compilation passed again after the final quantity-button styling adjustment.
- Local browser checks used copied application sources and disposable PostgreSQL databases. Admin entered `42000` / `21000` MMK at a fixture rate of `4200`; SQL confirmed `10.00` / `5.00` base prices. Editing with `13.50` / `6.75` SGD at `1.35` retained those base prices.
- Browser checkout with three units at base `9.99` persisted quantity `3`, base total `29.97`, currency `MMK` and payable total `125874.00`. Cart and checkout displayed the same payable amount.
- Browser checks covered autoplay with hover/focus, explicit Pause/Resume, home-card content, currency availability, cart counts/totals, reload and cross-tab persistence, legacy carts, maximum quantity, and 320/390/768/1440px layouts including Myanmar mobile. No browser page exceptions were recorded.
- Temporary preview servers and fixture databases were removed. The actual store's rates and product/order data were not changed.

## Evidence

- [Home and carousel results](tmp/product-updates-qa/home-results.json)
- [Currency and cart results](tmp/product-updates-qa/results.json)
- [Product currency on mobile](tmp/product-updates-qa/admin-currency-mobile.png)
- [Desktop cart](tmp/product-updates-qa/cart-1440.png)
- [Myanmar mobile cart](tmp/product-updates-qa/cart-my-320.png)
- [Confirmed checkout](tmp/product-updates-qa/checkout-quantity.png)

The cart screenshots precede the final removal of native button borders. No production deployment, real payment transfer or real-device testing was performed. Exchange rates in the browser tests were fixture values only.
