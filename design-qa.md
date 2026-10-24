# Admin list filters, sorting, chips and persistent URLs

Date: 2026-10-25

final result: passed

## Result and scope

Products now filter by category, featured Yes/No and discounted/regular price. Orders can filter by a product, including archived products referenced by historical orders. Payments filter by KBZPay/AYA Pay/WavePay and search by transaction reference as well as existing order/payment IDs and sender name. These criteria intersect with existing text/status/time/value filters.

All four list pages have local-calendar date presets (Today, Yesterday, Last 7 days including today, This month, Custom, All time), section-appropriate sort options, individually removable applied-filter chips and persistent query URLs. Product/category name sorts are available; value sorts use effective product price/order total/payment amount. Categories preserve their previous name-ascending default; other lists default newest first. Stable timestamp/ID tie-breakers preserve pagination.

Filter/sort changes return to page 1. Explicit changes push browser history; debounced text search replaces the current entry. Back/Forward, refresh and direct links restore criteria, sort, page and search input. Default/empty parameters are omitted; unrelated URL parameters and hashes remain. Invalid links display a notice with a clear/recovery action. Legacy order payment-status aliases remain represented truthfully in the status dropdown.

Applied chips group each time/value range into one removable criterion. Keyboard removal focuses the next chip or Filters trigger. Global summary counts remain independent of the filtered page. The longer dialog scrolls its fields while keeping heading and Reset/Apply controls visible. Named saved views remain deferred as discussed.

## Interfaces and data flow

Existing GET /api/admin/overview and GET /api/admin/products accept additional categoryId, featured (all/yes/no), discount (all/discounted/regular), productId, paymentMethod and sort parameters. IDs are positive int32 strings; filters and sorts are validated for their section. Sort values: newest, oldest, value_asc, value_desc, name_asc, name_desc. Unsupported combinations return HTTP 400. Existing status/date-time/value semantics remain.

The admin overview adds productOptions for the Orders selector. Options are independent of active list filters. Product-order matching uses EXISTS against order_items, preserving order-level totals/pagination. Sorting uses fixed ORM expressions, and reference text uses the existing escaped ILIKE search. Existing archive/manual-fulfillment behavior is retained.

URL times are explicit UTC ISO timestamps; restored controls use the viewer's device timezone. Presets resolve to absolute boundaries when selected rather than retaining a relative Today token. End-second timestamps remain inclusive through .999 milliseconds. This step requires no database migration or production deployment.

## Visual comparison and findings

Visual truth: the user's original conversation filter-dialog/card/sidebar screenshots and the accepted Cloud Nine admin from the preceding task. No local paths were provided for the original attachments; their zoom/density are unknown. This is a refinement of that selected structure, not a pixel-exact clone.

Rendered captures were opened and inspected. Desktop: 1440 x 900/1000 CSS px, deviceScaleFactor 1, Products with Published/Templates/Featured/Discounted active. Additional widths: 768, 390 and 320px. Mobile: 320 x 900, English and Burmese light/dark with all five supported locales tested.

- tmp/admin-list-qa/list-width-1440.png: sort control, four removable chips, consistent summary cards and filtered table.
- tmp/admin-list-qa/product-filter-desktop.png: section-specific criteria, date preset, scrollable fields and pinned footer.
- tmp/admin-list-qa/order-filter-desktop.png and payment-filter-desktop.png: appropriate Product/Payment method controls.
- tmp/admin-list-qa/filters-width-320.png and list-width-320.png: narrow toolbar/chips and always-visible action footer.
- tmp/admin-list-qa/filters-my-light.png and filters-my-dark.png: actual Burmese translations and real theme-toggle states.

Fidelity surfaces: existing Arial/Myanmar Text typography and UI/control scale remain; paired fields collapse to one column, toolbar/chips wrap within the viewport and dialog field scrolling preserves access to every control. Existing Cloud Nine surfaces, purple actions and accent chips follow shared tokens in both themes. Lucide icons and branding are unchanged; no raster assets are needed. Stored product/category names stay untranslated while new UI labels are localized in five dictionaries.

[P2, resolved] The expanded criteria would push action buttons below the viewport. The dialog now has a separately scrolling field region and pinned heading/footer; browser geometry verifies Apply remains inside the dialog without scrolling at every tested width. [P2, resolved] A URL serializer initially treated literal search text all as a selector default. It now omits all only for relevant selectors, with unit and browser regressions. No actionable P0/P1/P2 visual findings remain.

## Verification

Commands:

- node tmp/admin-list-qa.mjs
- node tmp/admin-list-locales-qa.mjs
- node node_modules/vitest/vitest.mjs run

Core evidence: tmp/admin-list-qa/results.json, 10 passed groups, errors: []. Strict locale evidence: tmp/admin-list-qa/locale-results.json, 11 passed checks, errors: []. QA uses headless local Chrome, an isolated Next mirror and disposable PGlite with real auth/API/SQL calls. It does not modify the user's database or production data.

Verified:

- Real intersections of category/featured/discount/status; effective-price sorting and distinct stable pages.
- Product-specific orders, archived option availability, payment method plus reference search and cross-section validation.
- Direct links, reload, Back/Forward, chip independence/focus, range-group removal, sort/page persistence and page reset.
- Debounced replace history, literal all search, search history restoration and preserved unrelated URL/hash.
- Whole local calendar presets, UTC serialization, automatic Custom selection for manual edits and restored preset selection.
- Section-specific controls and legacy order payment-status link rendering.
- All four list routes at 320px; Products/dialog at 1440/768/390/320px with no page overflow and visible footer actions.
- Actual html language and translated heading/field values for English/Burmese/Thai/Japanese/Chinese, both themes, category control geometry, and real theme/language controls preserving URL state.
- Zero browser runtime or console errors.

An initial invalid-link test accidentally matched Next's route-announcer alert and was scoped to the actual notice. A strict follow-up locale pass forces full reloads because hash-only navigation can preserve the existing document; it verifies html language and translated text rather than relying on cookie setting alone. Actual theme buttons and two rendered frames are used for final locale captures.

Root, admin and customer TypeScript checks, application boundaries, scoped Prettier and git diff --check passed. Vitest: 103 passed; nine existing opt-in PostgreSQL integration cases skipped by their environment gate. No production deployment or physical-device testing was performed. Disposable previews shut down after verification.

## Checklist

- [x] Product/category/featured/discount, order Product, payment method/reference filters.
- [x] Quick dates and stable section-specific sorting.
- [x] Removable, keyboard-accessible applied chips.
- [x] URL persistence, refresh, history and invalid-link recovery.
- [x] Responsive, localized browser/API/data and static verification.

Previous report: tmp/admin-list-qa/previous-design-qa.md.
