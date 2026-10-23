import { getServerI18n } from "../../lib/i18n-server";
import { notFound } from "next/navigation";
import { storageUrl } from "@marketplace/shared/storage";
import { Header } from "../../components/Header";
import { formatPrice } from "@marketplace/shared/pricing";
import { productBySlug } from "@marketplace/server/catalog";
import { AddToCartButton } from "../../cart/CartClient";
import {
  WishlistButton,
  ProductReviews,
} from "../../components/ProductActions";
export const dynamic = "force-dynamic";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { t, intlLocale } = await getServerI18n();
  const { slug } = await params;
  const product = await productBySlug(slug);
  if (!product) notFound();
  const item = {
    id: product.id,
    title: product.title,
    price: product.salePrice ?? product.price,
  };
  return (
    <>
      <Header />
      <main className="shell">
        <div className="detail">
          <div className={`detail-cover cover-${product.tone}`}>
            {product.thumbnailKey ? (
              <img
                className="product-image"
                src={storageUrl(product.thumbnailKey)}
                alt={product.title}
              />
            ) : (
              <strong>{product.title}</strong>
            )}
          </div>
          <article className="detail-copy">
            <p className="eyebrow plain">{product.category}</p>
            <h1>{product.title}</h1>
            <p>
              ★ {product.rating.toFixed(1)} · {product.sales} {t("sales")}
            </p>
            <p className="detail-description">{product.description}</p>
            <div className="purchase-panel">
              <div>
                <small>{t("One-time payment")}</small>
                <strong>{formatPrice(item.price, intlLocale)}</strong>
                {product.salePrice !== undefined && (
                  <s>{formatPrice(product.price, intlLocale)}</s>
                )}
              </div>
              <AddToCartButton item={item} buy />
              <AddToCartButton item={item} />
            </div>
            <p>
              {t("Products are delivered manually after payment approval.")}
            </p>
            <WishlistButton productId={product.id} />
            <div className="detail-grid">
              <div>
                <h2>{t("What is included")}</h2>
                <ul>
                  {(product.includes || t("Digital product"))
                    .split("\n")
                    .filter(Boolean)
                    .map(text => (
                      <li key={text}>{text}</li>
                    ))}
                </ul>
                {product.version && (
                  <p>
                    {t("Version")} {product.version}
                  </p>
                )}
              </div>
              <div>
                <h2>{t("License")}</h2>
                <p>{product.license}</p>
              </div>
            </div>
          </article>
        </div>
        <ProductReviews productId={product.id} />
      </main>
    </>
  );
}
