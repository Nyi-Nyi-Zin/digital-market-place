import { getServerI18n } from "./lib/i18n-server";
import { PackageCheck, ShieldCheck } from "lucide-react";
import { FeaturedProductBanner } from "./components/FeaturedProductBanner";
import { Storefront } from "./components/Storefront";
import { catalog } from "@marketplace/server/catalog";
import type { CatalogueFilters } from "@marketplace/shared/catalogue-filters";
import "./home.css";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<CatalogueFilters>;
}) {
  const { t } = await getServerI18n();
  const filters = await searchParams;
  const [result, featured] = await Promise.all([
    catalog(filters),
    catalog({ featured: true }),
  ]);
  return (
    <Storefront path="/" filters={filters} result={result}>
      {featured.products.length ? (
        <>
          <FeaturedProductBanner
            products={featured.products.map(product => ({
              id: product.id,
              slug: product.slug,
              title: product.title,
              category: product.category,
              description: product.shortDescription || product.description,
              price: product.price,
              salePrice: product.salePrice,
              thumbnailKey: product.thumbnailKey,
            }))}
          />
          <div className="storefront-trust">
            <span>
              <ShieldCheck size={15} aria-hidden="true" />{" "}
              {t("Reviewed payments")}
            </span>
            <span>
              <PackageCheck size={15} aria-hidden="true" />{" "}
              {t("Delivery after approval")}
            </span>
            <span>{t("Made for modern creators.")}</span>
          </div>
        </>
      ) : null}
    </Storefront>
  );
}
