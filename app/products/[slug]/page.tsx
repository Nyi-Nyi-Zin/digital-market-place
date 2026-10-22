import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { formatPrice } from "../../lib/catalog";
import { productBySlug } from "../../../server/catalog";
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
                src={`/manus-storage/${product.thumbnailKey}`}
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
              ★ {product.rating.toFixed(1)} · {product.sales} sales
            </p>
            <p className="detail-description">{product.description}</p>
            <div className="purchase-panel">
              <div>
                <small>One-time payment</small>
                <strong>{formatPrice(item.price)}</strong>
                {product.salePrice !== undefined && (
                  <s>{formatPrice(product.price)}</s>
                )}
              </div>
              <AddToCartButton item={item} buy />
              <AddToCartButton item={item} />
            </div>
            <WishlistButton productId={product.id} />
            <div className="detail-grid">
              <div>
                <h2>What is included</h2>
                <ul>
                  {(product.includes || "Digital source files")
                    .split("\n")
                    .filter(Boolean)
                    .map(text => (
                      <li key={text}>{text}</li>
                    ))}
                </ul>
                <p>
                  {product.fileType} · {product.fileSize} · Version{" "}
                  {product.version}
                </p>
              </div>
              <div>
                <h2>License</h2>
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
