import { getServerI18n } from "../lib/i18n-server";
import Link from "next/link";
import { storageUrl } from "@marketplace/shared/storage";
import { ArrowUpRight, PackageOpen } from "lucide-react";
import type { Product } from "@marketplace/shared/pricing";
import { Price } from "./CurrencyProvider";

export async function ProductCard({
  product,
}: {
  product: Product;
  index?: number;
}) {
  const { t } = await getServerI18n();
  const href = `/products/${product.slug}`;
  const hasDiscount = product.salePrice != null;

  return (
    <article className="product-card">
      <Link
        className={`cover cover-${product.tone}`}
        href={href}
        aria-label={t("View {title}", { title: product.title })}
      >
        {product.thumbnailKey ? (
          <img
            className="product-image"
            src={storageUrl(product.thumbnailKey)}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="cover-fallback">
            <PackageOpen size={30} strokeWidth={1.5} aria-hidden="true" />
            <strong>{product.title}</strong>
          </div>
        )}
        <span className="file-tag">{t("Digital product")}</span>
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{product.category || t("Digital resource")}</span>
        </div>
        <h3>
          <Link href={href}>{product.title}</Link>
        </h3>
        <p>{product.shortDescription || product.description}</p>
        <div className="card-bottom">
          <div className="card-price">
            <strong>
              <Price value={product.salePrice ?? product.price} />
            </strong>
            {hasDiscount ? (
              <s>
                <Price value={product.price} />
              </s>
            ) : null}
          </div>
          <Link
            className="card-view"
            href={href}
            aria-label={t("View {title}", { title: product.title })}
          >
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
