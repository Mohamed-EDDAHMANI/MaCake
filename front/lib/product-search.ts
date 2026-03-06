import type { Product } from "@/store/features/catalog";

/**
 * Normalize and split a search query into tokens (lowercase, non-empty).
 */
function toTokens(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Return true if the product matches the query.
 * Matches against: title, description, category name, patissiere name.
 */
function productMatchesQuery(product: Product, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const title = (product.title ?? "").toLowerCase();
  const description = (product.description ?? "").toLowerCase();
  const categoryName = (product.category?.name ?? "").toLowerCase();
  const chefName = (product.patissiere?.name ?? "").toLowerCase();
  const searchable = [title, description, categoryName, chefName].join(" ");
  return tokens.every((t) => searchable.includes(t));
}

/**
 * Filter products by a search query (title, description, category, chef name).
 * Used in Explore and Favorites without duplicating logic.
 */
export function filterProductsBySearchQuery(
  products: Product[],
  query: string
): Product[] {
  const tokens = toTokens(query);
  if (tokens.length === 0) return products;
  return products.filter((p) => productMatchesQuery(p, tokens));
}
