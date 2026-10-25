import { getServerI18n } from "../../lib/i18n-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Header } from "../../components/Header";
import { ProductDetailCover } from "../../components/ProductDetailCover";
import { Price } from "../../components/CurrencyProvider";
import { productBySlug } from "@marketplace/server/catalog";
import { AddToCartButton } from "../../cart/CartClient";
import { WishlistButton } from "../../components/ProductActions";
import "./detail.css";
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
      <main className="shell product-detail-page">
        <Link className="detail-back" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          {t("Back to marketplace")}
        </Link>
        <div className="detail">
          <ProductDetailCover
            key={product.thumbnailKey}
            title={product.title}
            thumbnailKey={product.thumbnailKey}
          />
          <article className="detail-copy">
            <div className="detail-meta">
              <span className="detail-category">
                {product.category || t("Digital product")}
              </span>
              {product.sales > 0 && (
                <span>
                  {new Intl.NumberFormat(intlLocale).format(product.sales)}{" "}
                  {t("sales")}
                </span>
              )}
            </div>
            <h1>{product.title}</h1>
            <p className="detail-description">{product.description}</p>
            <div className="purchase-panel">
              <div className="detail-price">
                <small>{t("One-time payment")}</small>
                <div className="detail-price-amounts">
                  <strong>
                    <Price value={item.price} />
                  </strong>
                  {product.salePrice !== undefined && (
                    <s>
                      <Price value={product.price} />
                    </s>
                  )}
                </div>
              </div>
              <div className="detail-purchase-actions">
                <AddToCartButton item={item} buy />
                <AddToCartButton item={item} />
              </div>
              <p className="detail-delivery">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>
                  {t("Products are delivered manually after payment approval.")}
                </span>
              </p>
            </div>
            <div className="detail-wishlist">
              <WishlistButton productId={product.id} />
            </div>
            <div className="detail-grid">
              <div>
                <h2>{t("What is included")}</h2>
                <ul>
                  {(product.includes || t("Digital product"))
                    .split("\n")
                    .filter(Boolean)
                    .map((text, index) => (
                      <li key={index}>
                        <Check size={15} aria-hidden="true" />
                        <span>{text}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h2>{t("License")}</h2>
                <p>{product.license}</p>
              </div>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}
