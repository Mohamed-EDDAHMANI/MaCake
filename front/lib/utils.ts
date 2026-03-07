import { API_BASE_URL } from "@/lib/axios";

/** Product detail route inside (main) stack — works from Explore and Favorites. */
export function getProductDetailPath(productId: string): string {
  return `/(main)/product/${productId}`;
}

/**
 * Build a full photo URL from a relative path stored in DB.
 * Returns null if the photo is falsy.
 */
export function buildPhotoUrl(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http") ? photo : `${API_BASE_URL}${photo}`;
}
