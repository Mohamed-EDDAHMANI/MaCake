import { api } from "@/lib/axios";

/* ─── Category types ─── */

export interface Category {
  id: string;
  name: string;
  description?: string;
}

/* ─── Product types ─── */

export interface PatissiereInfo {
  id: string;
  name: string;
  photo: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating: number;
  ratingCount: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  category?: { id: string; name: string };
  images?: string[];
  ingredients?: string[];
  patissiereId?: string;
  patissiere?: PatissiereInfo | null;
  likesCount?: number;
  /** User IDs who liked this product (to show heart filled for current user). */
  likedByUserIds?: string[];
  rating?: number;
  personalizationOptions?: Record<string, unknown>;
  createdAt?: string;
  /** Not in current catalog API; reserved if backend adds it later. */
  location?: string | null;
}

/* ─── Category API ─── */

/**
 * Fetch all categories from the catalog service.
 * GET /s2/category/find-all  (public route — no token needed)
 */
export async function fetchCategoriesApi(): Promise<Category[]> {
  const res = await api.get("/s2/category/find-all");
  const raw: any[] = res.data?.data?.categories ?? res.data?.data ?? [];
  return raw.map((c) => ({
    id: c.id ?? c._id,
    name: c.name,
    description: c.description,
  }));
}

/* ─── Product API ─── */

/**
 * Catalog service find-all returns (see find-all-products.use-case.ts):
 *   { success, statusCode, message, data: { products: [...], count }, error, timestamp }
 * Gateway may forward as-is (body.data.products) or wrap (body.data.data.products).
 * This extracts the products array from any of those shapes.
 */
function extractProductsArray(body: any): any[] {
  if (!body || typeof body !== "object") return [];

  // 1) body.data.products — catalog direct
  const direct = body?.data?.products;
  if (Array.isArray(direct)) return direct;

  // 2) body.data.data.products — gateway wrapped catalog response
  const nested = body?.data?.data?.products;
  if (Array.isArray(nested)) return nested;

  // 3) Other common shapes
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;

  // 4) Deep search: find any "products" key whose value is an array (handles arbitrary wrapping)
  function findProductsArray(obj: any, depth: number): any[] | null {
    if (depth > 5 || !obj || typeof obj !== "object") return null;
    if (Array.isArray(obj.products)) return obj.products;
    for (const key of Object.keys(obj)) {
      const found = findProductsArray(obj[key], depth + 1);
      if (found) return found;
    }
    return null;
  }
  const deep = findProductsArray(body, 0);
  if (deep) return deep;

  // 5) Single product as body.data or body.data.data
  const single =
    body?.data?.data != null && typeof body.data.data === "object" && !Array.isArray(body.data.data)
      ? body.data.data
      : body?.data != null && typeof body.data === "object" && !Array.isArray(body.data)
        ? body.data
        : null;
  if (single && (single.id != null || single.title != null)) {
    return [single];
  }

  return [];
}

/**
 * Fetch all products from the catalog service.
 * GET /s2/product/find-all  (public route)
 */
export async function fetchProductsApi(): Promise<Product[]> {
  const res = await api.get("/s2/product/find-all");
  const body = res.data;
  const raw = extractProductsArray(body);
  console.log(res.data?.data?.products);
  if (raw.length === 0 && body != null) {
    console.log(
      "[catalog] find-all: no products extracted. Response keys:",
      JSON.stringify(Object.keys(body)),
      "| body.data keys:",
      body?.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? JSON.stringify(Object.keys(body.data))
        : "n/a",
      "| sample:",
      JSON.stringify(body).slice(0, 400),
    );
  }
  return raw.map(mapProduct);
}

/**
 * Fetch a single product by ID.
 * GET /s2/product/getOne/:id  (public route)
 */
export async function fetchProductByIdApi(id: string): Promise<Product> {
  const res = await api.get(`/s2/product/getOne/${id}`);
  const raw = res.data?.data?.product ?? res.data?.data ?? res.data;
  return mapProduct(raw);
}

/**
 * Fetch minimal product info (id, title, image) for a batch of product IDs.
 * POST /s2/product/batch  (public route — used by order cards)
 */
export async function fetchProductsBatchApi(
  ids: string[]
): Promise<Array<{ id: string; title: string; image: string | null }>> {
  if (ids.length === 0) return [];
  const res = await api.post("/s2/product/batch", { ids });
  const raw: any[] = res.data?.data?.products ?? res.data?.products ?? [];
  return raw.map((p: any) => ({
    id: String(p.id ?? p._id ?? ""),
    title: String(p.title ?? ""),
    image: p.image ?? null,
  }));
}

/**
 * Filter products by criteria (category, price range, etc.).
 * POST /s2/product/filter  (public route)
 */
export async function filterProductsApi(
  filters: Record<string, unknown>
): Promise<Product[]> {
  const res = await api.post("/s2/product/filter", filters);
  console.log(res.data?.data?.products);
  const raw: any[] = res.data?.data?.products ?? res.data?.data ?? [];
  return raw.map(mapProduct);
}

/* ─── Helpers ─── */

function mapProduct(c: any): Product {
  if (!c || typeof c !== "object") {
    return {
      id: "",
      title: "",
      description: "",
      price: 0,
      isActive: true,
      categoryId: "",
    };
  }
  const categoryId =
    typeof c.categoryId === "string"
      ? c.categoryId
      : c.categoryId?.id ?? c.categoryId?._id ?? c.categoryId ?? "";
  const category =
    c.category?.id != null && c.category?.name != null
      ? { id: String(c.category.id), name: String(c.category.name) }
      : c.categoryId?.name
        ? { id: String(c.categoryId.id ?? c.categoryId._id ?? ""), name: String(c.categoryId.name) }
        : undefined;
  return {
    id: String(c.id ?? c._id ?? ""),
    title: String(c.title ?? ""),
    description: String(c.description ?? ""),
    price: Number(c.price) || 0,
    isActive: c.isActive !== false,
    categoryId,
    category,
    images: Array.isArray(c.images) ? c.images : [],
    ingredients: Array.isArray(c.ingredients) ? c.ingredients : [],
    patissiereId: c.patissiereId,
    patissiere: c.patissiere
      ? {
          id: c.patissiere.id ?? "",
          name: c.patissiere.name ?? "",
          photo: c.patissiere.photo ?? null,
          city: c.patissiere.city ?? null,
          address: c.patissiere.address ?? null,
          rating: Number(c.patissiere.rating) || 0,
          ratingCount: Number(c.patissiere.ratingCount) || 0,
        }
      : null,
    likesCount: Number(c.likesCount) || 0,
    likedByUserIds: Array.isArray(c.likedByUserIds)
      ? c.likedByUserIds.map((id: any) => String(id))
      : [],
    rating: Number(c.rating) || 0,
    personalizationOptions: c.personalizationOptions,
    createdAt: c.createdAt,
    // Backend sets location from patissiere.city in catalog-service enrichment.
    location: c.location ?? c.patissiere?.city ?? null,
  };
}

/* ─── Like (notation s5) ─── */

/**
 * Toggle like on a product. Requires auth (Bearer). Body: { productId, userId }.
 * Sending userId from client ensures notation service receives it (gateway may not forward user to s5).
 */
export async function toggleLikeApi(
  productId: string,
  userId: string,
): Promise<{ liked: boolean; count: number }> {
  const res = await api.post<{ success: boolean; data?: { liked: boolean; count: number } }>(
    "/s6/like/toggle",
    { productId, userId },
  );
  const data = res.data?.data;
  return {
    liked: data?.liked ?? false,
    count: data?.count ?? 0,
  };
}
