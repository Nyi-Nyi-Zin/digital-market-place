import { getServerI18n } from "../lib/i18n-server";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type { catalog } from "@marketplace/server/catalog";
import {
  catalogueHref,
  type CatalogueFilters,
} from "@marketplace/shared/catalogue-filters";
import { CatalogueControls, CatalogueSort } from "./CatalogueControls";
import { Header } from "./Header";
import { ProductCard } from "./ProductCard";
import "../products/catalogue.css";
import { getServerCurrency } from "../lib/currency-server";

export async function Storefront({
  result,
  filters,
  path,
  children,
}: {
  result: Awaited<ReturnType<typeof catalog>>;
  filters: CatalogueFilters;
  path: "/";
  children?: ReactNode;
}) {
  const { t, intlLocale } = await getServerI18n();
  const { currency } = await getServerCurrency();
  const libraryTotal = result.categories.reduce(
    (total, category) => total + category.count,
    0
  );
  const numberFormat = new Intl.NumberFormat(intlLocale);
  const formatCount = (count: number) => numberFormat.format(count);
  const resourceCount = t(
    result.total === 1 ? "{count} resource" : "{count} resources",
    {
      count: formatCount(result.total),
    }
  );
  const chips = [
    filters.query?.trim()
      ? { key: "query", label: t("Search: {query}", { query: filters.query }) }
      : null,
    filters.category ? { key: "category", label: filters.category } : null,
    filters.minPrice?.trim()
      ? {
          key: "minPrice",
          label: t("Min. price: {price}", {
            price: `${currency} ${filters.minPrice}`,
          }),
        }
      : null,
    filters.maxPrice?.trim()
      ? {
          key: "maxPrice",
          label: t("Max. price: {price}", {
            price: `${currency} ${filters.maxPrice}`,
          }),
        }
      : null,
  ].filter(chip => chip !== null);
  const Heading = children && !chips.length ? "h2" : "h1";
  return (
    <>
      <Header />
      <main className="shell catalogue storefront">
        <CatalogueControls
          path={path}
          filters={filters}
          categories={result.categories.map(({ id, name }) => ({ id, name }))}
        />
        <nav
          className="catalogue-categories"
          id="categories"
          aria-label={t("Product categories")}
        >
          <Link
            href={catalogueHref(path, filters, { category: undefined })}
            aria-current={!filters.category ? "page" : undefined}
          >
            {t("All resources")}
            <span className="category-count">{formatCount(libraryTotal)}</span>
          </Link>
          {result.categories.map(category => (
            <Link
              key={category.id}
              href={catalogueHref(path, filters, { category: category.name })}
              aria-current={
                filters.category === category.name ||
                filters.category === category.slug
                  ? "page"
                  : undefined
              }
            >
              {category.name}
              <span className="category-count">
                {formatCount(category.count)}
              </span>
            </Link>
          ))}
        </nav>
        {chips.length ? (
          <div className="catalogue-selection">
            <strong>
              {t(
                result.total === 1
                  ? "{count} resource found"
                  : "{count} resources found",
                { count: formatCount(result.total) }
              )}
            </strong>
            <div className="catalogue-chips">
              {chips.map(chip => (
                <Link
                  key={chip.key}
                  className="catalogue-chip"
                  href={catalogueHref(path, filters, { [chip.key]: undefined })}
                  aria-label={t("Remove {filter} filter", {
                    filter: chip.label,
                  })}
                >
                  {chip.label}
                  <X size={13} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <Link
              className="catalogue-clear"
              href={catalogueHref(path, { sort: filters.sort })}
            >
              {t("Clear all")}
            </Link>
          </div>
        ) : (
          children
        )}
        <section className="catalogue-library" aria-labelledby="library-title">
          <div className="catalogue-results">
            <div className="catalogue-results-title">
              <Heading id="library-title">{t("Explore the library")}</Heading>
              <span className="resource-count">{resourceCount}</span>
            </div>
            <CatalogueSort path={path} filters={filters} />
          </div>
          {result.products.length ? (
            <div className="product-grid">
              {result.products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showDescription={path !== "/"}
                />
              ))}
            </div>
          ) : (
            <div className="empty-panel catalogue-empty">
              <Search size={30} strokeWidth={1.5} aria-hidden="true" />
              <h2>
                {chips.length
                  ? t("No finds just yet.")
                  : t("The library is getting ready.")}
              </h2>
              <p>
                {chips.length
                  ? t(
                      "Try a broader search or clear your filters to explore the full library."
                    )
                  : t(
                      "New digital resources will appear here as they're published. Check back soon."
                    )}
              </p>
              {chips.length ? (
                <Link className="button button-secondary" href={path}>
                  {t("Explore all resources")}{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          )}
          {result.pages > 1 ? (
            <nav className="pager" aria-label={t("Product pages")}>
              {Array.from(
                { length: result.pages },
                (_, index) => index + 1
              ).map(page => (
                <Link
                  key={page}
                  aria-label={t("Page {page}", { page })}
                  aria-current={page === result.page ? "page" : undefined}
                  href={catalogueHref(path, filters, { page: String(page) })}
                >
                  {page}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>
      </main>
    </>
  );
}
