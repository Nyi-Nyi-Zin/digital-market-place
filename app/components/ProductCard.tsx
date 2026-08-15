import Link from "next/link";
import { Product, formatPrice } from "../lib/catalog";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return <article className="product-card"><Link className={`cover cover-${product.tone}`} href={`/products/${product.slug}`}><span className="cover-pattern" /><span className="file-tag">Digital</span><strong>{product.title}</strong></Link><div className="card-body"><div className="card-meta"><span>{product.category}</span><span>★ {product.rating.toFixed(1)}</span></div><Link href={`/products/${product.slug}`}><h3>{product.title}</h3></Link><p>{product.description}</p><div className="card-bottom"><strong>{formatPrice(product.salePrice ?? product.price)} {product.salePrice ? <s>{formatPrice(product.price)}</s> : null}</strong><span>{product.sales} sales</span></div></div></article>;
}
