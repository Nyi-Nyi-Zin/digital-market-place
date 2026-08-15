import { NextResponse } from "next/server";
import { products } from "../../lib/catalog";
import { listCategories, listProducts } from "../../../server/db";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("query") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const sort = url.searchParams.get("sort") as "newest" | "best" | "price_low" | "price_high" | "rating" | null;
  const categories = category ? await listCategories() : [];
  const categoryId = categories.find((entry) => entry.name === category)?.id;
  const databaseProducts = await listProducts({ search, categoryId, sort: sort ?? undefined });
  const payload = databaseProducts.length ? databaseProducts : products;
  return NextResponse.json({ products: payload, total: payload.length });
}
