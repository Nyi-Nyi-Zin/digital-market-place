export type CatalogueFilters = {
  query?: string;
  category?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  page?: string;
};

export const catalogueSortOptions = [
  ["newest", "Recently added"],
  ["best", "Best sellers"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["rating", "Highest rated"],
] as const;

export function catalogueHref(
  path: string,
  filters: CatalogueFilters,
  changes: CatalogueFilters = {}
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    ...filters,
    page: undefined,
    ...changes,
  })) {
    if (value?.trim()) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
