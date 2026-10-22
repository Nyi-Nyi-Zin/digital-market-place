import Link from "next/link";
import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { catalog } from "../server/catalog";
import type { Product } from "./lib/catalog";
export const dynamic = "force-dynamic";
import "./home.css";

export default async function HomePage() {
  const [
    { products, categories },
    { products: bestSellers },
    { products: recentlyAdded },
  ] = await Promise.all([
    catalog({ featured: true }),
    catalog({ sort: "best" }),
    catalog({ sort: "newest" }),
  ]);
  const featured = products.filter(p => p.featured).slice(0, 4);

  return (
    <>
      <Header />
      <main>
        <section className="shell hero">
          <div className="hero-copy">
            <p className="eyebrow">
              ✧ Curated digital goods for ambitious makers
            </p>
            <h1>
              Build better, <em>ship sooner.</em>
            </h1>
            <p className="lead">
              Premium UI kits, templates, source code, and creative resources
              made for modern creators in Myanmar and beyond.
            </p>
            <div className="actions">
              <Link className="button button-dark" href="/products">
                Explore products →
              </Link>
              <a className="button button-secondary" href="#categories">
                Browse categories
              </a>
            </div>
            <div className="trust">
              <span>✓ Instant access after approval</span>
              <span>⌾ Verified manual payments</span>
            </div>
          </div>
          <div className="toolkit">
            <p className="toolkit-label">CREATOR TOOLKIT</p>
            <h2>
              Everything to move from idea to launch. <b>ϟ</b>
            </h2>
            <div className="tool-grid">
              {[
                "Figma systems",
                "React starters",
                "Icon packs",
                "Notion kits",
              ].map((item, i) => (
                <div key={item}>
                  <i className={`dot dot-${i}`} /> <strong>{item}</strong>
                  <small>Ready to customize</small>
                </div>
              ))}
            </div>
            <Link href="/products" className="toolkit-cta">
              Your next launch starts here. <span>→</span>
            </Link>
          </div>
        </section>
        <section className="category-section" id="categories">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow plain">EXPLORE THE LIBRARY</p>
                <h2>Find the right starting point</h2>
              </div>
              <Link href="/products">View all products →</Link>
            </div>
            <div className="category-grid">
              {categories.map(({ name: category }) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                >
                  <strong>{category}</strong>
                  <span>Curated resources</span>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <ProductSection
          label="EDITOR’S PICKS"
          title="Featured products"
          link="See collection"
          products={featured}
        />
        <ProductSection
          label="TRENDING NOW"
          title="Best sellers"
          link="View best sellers"
          products={bestSellers.slice(0, 4)}
        />
        <ProductSection
          label="FRESHLY ADDED"
          title="Recently added"
          link="See latest"
          products={recentlyAdded.slice(0, 4)}
        />
        <section className="dark-section">
          <div className="shell">
            <p className="eyebrow dark">THE MARKETPLACE DIFFERENCE</p>
            <h2>Quality resources, without the noise.</h2>
            <div className="value-grid">
              {[
                [
                  "⇩",
                  "Instant digital access",
                  "Download approved purchases from one organized library.",
                ],
                [
                  "◈",
                  "Trusted checkout",
                  "Manual payment review keeps every order transparent and accountable.",
                ],
                [
                  "★",
                  "Curated quality",
                  "Practical products selected to help you build work you are proud of.",
                ],
                [
                  "ϟ",
                  "Lifetime access",
                  "Keep your digital goods available whenever you need them.",
                ],
              ].map(([icon, title, copy]) => (
                <div key={title}>
                  <b>{icon}</b>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="shell final-cta">
          <p className="eyebrow plain">READY WHEN YOU ARE</p>
          <h2>Start building something great today.</h2>
          <p>
            Browse a growing collection of digital products designed to make the
            next step easier.
          </p>
          <Link className="button button-primary" href="/products">
            Explore products →
          </Link>
        </section>
      </main>
      <footer>
        <div className="shell">
          © 2026 Cloud Nine. Built for modern creators.
          <span>Manual Myanmar payment review · Secure digital delivery</span>
        </div>
      </footer>
    </>
  );
}

function ProductSection({
  label,
  title,
  link,
  products: sectionProducts,
}: {
  label: string;
  title: string;
  link: string;
  products: Product[];
}) {
  return (
    <section className="shell products-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow plain">{label}</p>
          <h2>{title}</h2>
        </div>
        <Link href="/products">{link} →</Link>
      </div>
      <div className="product-grid">
        {sectionProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
