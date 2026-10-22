import Link from "next/link";
import { Header } from "../components/Header";
import { ProductCard } from "../components/ProductCard";
import { catalog } from "../../server/catalog";
export const dynamic = "force-dynamic";
type Filters = {
  query?: string;
  category?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  page?: string;
};
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const result = await catalog(filters);
  return (
    <>
      <Header />
      <main className="shell catalogue">
        <div className="catalogue-title">
          <p className="eyebrow plain">DIGITAL PRODUCT LIBRARY</p>
          <h1>Find your next shortcut.</h1>
          <p>Digital resources for your next project.</p>
        </div>
        <form className="filter-bar">
          <label>
            Search
            <input
              name="query"
              defaultValue={filters.query}
              placeholder="Templates, UI kits, code…"
            />
          </label>
          <label>
            Category
            <select
              aria-label="Category"
              name="category"
              defaultValue={filters.category ?? ""}
            >
              <option value="">All categories</option>
              {result.categories.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select
              aria-label="Sort"
              name="sort"
              defaultValue={filters.sort ?? "newest"}
            >
              {[
                ["newest", "Recently added"],
                ["best", "Best sellers"],
                ["price_asc", "Price: low to high"],
                ["price_desc", "Price: high to low"],
                ["rating", "Highest rated"],
              ].map(([v, t]) => (
                <option value={v} key={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Min price
            <input
              name="minPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={filters.minPrice}
            />
          </label>
          <label>
            Max price
            <input
              name="maxPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={filters.maxPrice}
            />
          </label>
          <label>
            Rating
            <select
              aria-label="Rating"
              name="minRating"
              defaultValue={filters.minRating ?? "0"}
            >
              <option value="0">All ratings</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
            </select>
          </label>
          <button className="button button-primary">Apply filters</button>
          <Link href="/products">Reset</Link>
        </form>
        <p>{result.total} products</p>
        <div className="product-grid">
          {result.products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!result.products.length && (
          <div className="empty-panel">
            No products match. Try another search or category.
          </div>
        )}
        <nav className="pager" aria-label="Product pages">
          {Array.from({ length: result.pages }, (_, i) => i + 1).map(page => (
            <Link
              aria-current={page === result.page ? "page" : undefined}
              key={page}
              href={`/products?${new URLSearchParams({ ...filters, page: String(page) })}`}
            >
              {page}
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}
