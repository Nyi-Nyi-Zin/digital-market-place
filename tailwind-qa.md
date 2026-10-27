# Whole-site Tailwind migration

Customer and admin styling is now authored with Tailwind v4 throughout both applications. The 19 stylesheets use Tailwind utilities and reusable `@apply` recipes for page layouts, descendants, state selectors, and responsive rules. Design variables and animation keyframes remain CSS. Sonner retains its inline theme variables.

Each app has an independent `app/tailwind.css` entry point and shadcn configuration. Source scanning covers customer pages/components and admin pages/components. The 404 page, global error boundaries, and customer brand mark also use Tailwind classes. Global error boundaries import their stylesheet independently of the root layout.

The migration retains the existing selector order, media queries, light/dark palettes, customer footer, and application boundaries. It does not change pricing logic or persisted exchange rates.

## Local checks

| Check                                | Result                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                      | Passed TypeScript, application boundaries, and Tailwind checks                                                                |
| `npm run check:styles`               | All 19 stylesheets compile; page declarations must use utilities or `@apply`                                                  |
| Customer and admin production builds | Passed; final sequential build used `CIRCLE_NODE_TOTAL=2` to limit build workers on this machine                              |
| CSS declaration comparison           | 3,896 declarations migrated; 3,898 original declaration values checked, including unchanged animation frames; zero mismatches |
| Browser checks                       | 115 passed, zero runtime errors or HTTP 5xx responses                                                                         |
| Patch whitespace                     | `git diff --check` passed                                                                                                     |

The declaration comparison checks properties, values, and importance in the original selector/media contexts. It supplements rendered browser checks rather than proving pixel equivalence by itself.

## Browser coverage

The production builds ran on temporary local preview ports with a disposable PostgreSQL database. Product and payment images used mocked local images. The fixture included verified customer/admin identities, products, an approved order, payment methods, notifications, a support thread, and test exchange rates.

- 45 public, customer account, and admin route/session combinations at 1440px and 390px, including authentication, catalogue/detail, filled cart/checkout, purchases, support, notifications, orders, customers, reports, activity, payment settings, store content, and account settings.
- Customer and admin 404 states.
- Admin filter and product dialogs on desktop and mobile.
- Customer home and admin store settings in English, Myanmar, Thai, Japanese, and Chinese, using dark mode at 320px and 768px.
- Mobile menu, SGD selection, Escape dismissal, and focus restoration.
- Document bounds and loaded base styles on captured routes.

Screenshots were also inspected for the customer desktop/mobile catalogue, admin overview, mobile store settings, filter/product dialogs, and Myanmar dark store settings.

Evidence is available in [browser results](tmp/tailwind-migration/browser/results.json), [declaration comparison](tmp/tailwind-migration/parity.json), and the [screenshot folder](tmp/tailwind-migration/browser). The temporary database and preview servers were removed after the checks.

This verifies local builds and browser behavior. It does not represent a deployment or live email, push, storage, or payment-provider verification. Global error boundary styling was compiled and reviewed; a production server failure was not deliberately triggered.

See [the styling guide](docs/styling.md) for the Tailwind entry points, tokens, and authoring convention.
