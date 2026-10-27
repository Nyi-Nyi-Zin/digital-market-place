# Tailwind styling

Customer and admin are independent Tailwind v4 applications. Their entry points are `customer-web/app/tailwind.css` and `admin/app/tailwind.css`; each app's shadcn configuration points to its own entry point. Customer source scanning includes the entire `app/` tree. Admin scanning includes both `app/` and `components/`.

## Authoring styles

Use Tailwind utility classes directly for new JSX layouts and controls. Reusable component classes, descendant selectors, state selectors, and existing responsive rules compose the same utilities with `@apply`. This preserves the established Cloud Nine cascade and breakpoints across every page while making Tailwind responsible for their styling.

Each component stylesheet starts with an `@reference` to its app's Tailwind entry point. For example, a stylesheet next to that entry point uses:

```css
@reference "./tailwind.css";

.example-panel {
  @apply grid gap-[20px] rounded-[12px] p-[20px] text-ink;
}
```

The theme exposes `paper`, `surface`, `surface-soft`, `ink`, `muted-ink`, `line`, `brand`, and `accent-ink`, alongside the shadcn color tokens. Each token resolves to that application's existing light and dark variables. Customer and admin palettes remain independent.

Arbitrary utility values preserve the established pixel sizes and CSS shorthands, including gradients, borders, and typography. Keep custom properties, font definitions, and animation keyframes as CSS. Keep component state and responsive selectors next to their utility recipes so their order remains explicit. Preflight is intentionally omitted because the apps supply their own Tailwind base recipes and control defaults.

## Checks

Run `npm run check:styles` to compile all 19 stylesheets with the installed Tailwind/PostCSS version and reject unconverted page declarations. The same check runs in `npm run check`. Use the two production builds and responsive browser checks when changing layout or styling across pages.
