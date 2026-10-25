import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "./database";
import { products, categories } from "./schema";
import type { PublicProduct } from "@marketplace/shared/product";
import { fractionDigits, type Currency } from "@marketplace/shared/currency";
export type { PublicProduct } from "@marketplace/shared/product";
export const publicProductFields = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  price: products.price,
  discountPrice: products.discountPrice,
  shortDescription: products.shortDescription,
  description: products.description,
  categoryId: products.categoryId,
  thumbnailKey: products.thumbnailKey,
  fileType: products.fileType,
  fileSize: products.fileSize,
  version: products.version,
  license: products.license,
  includes: products.includes,
  tags: products.tags,
  rating: products.rating,
  salesCount: products.salesCount,
  featured: products.featured,
  createdAt: products.createdAt,
};
export function toPublicProduct(
  row: typeof products.$inferSelect,
  category: string
): PublicProduct {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category,
    categoryId: row.categoryId,
    price: Number(row.price),
    salePrice:
      row.discountPrice !== null ? Number(row.discountPrice) : undefined,
    rating: Number(row.rating),
    sales: row.salesCount,
    description: row.description ?? "",
    shortDescription: row.shortDescription ?? "",
    thumbnailKey: row.thumbnailKey,
    fileType: row.fileType,
    fileSize: row.fileSize,
    version: row.version,
    license: row.license,
    includes: row.includes,
    featured: row.featured,
    createdAt: row.createdAt,
    tone: "violet",
  };
}
export async function catalog(
  input: {
    query?: string;
    category?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
    featured?: boolean;
    displayCurrency?: Currency;
    displayRate?: string;
  } = {}
) {
  const db = getDb();
  const groups = await db.select().from(categories).orderBy(categories.name);
  const where = [eq(products.status, "published")];
  if (input.featured === true) where.push(eq(products.featured, true));
  if (input.query)
    where.push(
      or(
        ilike(products.title, `%${input.query}%`),
        ilike(products.description, `%${input.query}%`),
        ilike(products.tags, `%${input.query}%`)
      )!
    );
  if (input.category) {
    const category = groups.find(
      c => c.name === input.category || c.slug === input.category
    );
    if (!category)
      return { products: [], categories: groups, total: 0, page: 1, pages: 1 };
    where.push(eq(products.categoryId, category.id));
  }
  const basePrice = sql`coalesce(${products.discountPrice},${products.price})`;
  const price =
    input.displayCurrency && input.displayRate
      ? sql`round(${basePrice} * ${input.displayRate}::numeric, ${fractionDigits(input.displayCurrency)})`
      : basePrice;
  if (
    Boolean(input.minPrice?.trim()) &&
    Number.isFinite(Number(input.minPrice))
  )
    where.push(sql`${price} >= ${Number(input.minPrice)}`);
  if (
    Boolean(input.maxPrice?.trim()) &&
    Number.isFinite(Number(input.maxPrice))
  )
    where.push(sql`${price} <= ${Number(input.maxPrice)}`);
  const sort =
    input.sort === "price_asc"
      ? price
      : input.sort === "price_desc"
        ? desc(price)
        : input.sort === "best"
          ? desc(products.salesCount)
          : desc(products.createdAt);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...where));
  const page = Math.max(
    1,
    Math.min(Math.ceil(total / 24) || 1, Number(input.page) || 1)
  );
  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...where))
    .orderBy(sort, desc(products.id))
    .limit(24)
    .offset((page - 1) * 24);
  return {
    products: rows.map(row =>
      toPublicProduct(row.product, row.category?.name ?? "")
    ),
    categories: groups,
    total,
    page,
    pages: Math.ceil(total / 24) || 1,
  };
}
export async function productBySlug(slug: string) {
  const rows = await getDb()
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .limit(1);
  return rows[0]
    ? toPublicProduct(rows[0].product, rows[0].category?.name ?? "")
    : undefined;
}
