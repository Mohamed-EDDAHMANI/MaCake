import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchCategoriesApi,
  fetchProductsApi,
  fetchProductByIdApi,
  filterProductsApi,
  toggleLikeApi,
  type Category,
  type Product,
} from "./catalogApi";

export type { Category, Product, PatissiereInfo } from "./catalogApi";

export interface CatalogState {
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;

  products: Product[];
  productsLoading: boolean;
  productsError: string | null;

  selectedProduct: Product | null;
  selectedProductLoading: boolean;
  selectedProductError: string | null;
}

const initialState: CatalogState = {
  categories: [],
  categoriesLoading: false,
  categoriesError: null,

  products: [],
  productsLoading: false,
  productsError: null,

  selectedProduct: null,
  selectedProductLoading: false,
  selectedProductError: null,
};

/* ─── Async thunks ─── */

export const fetchCategories = createAsyncThunk(
  "catalog/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchCategoriesApi();
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to fetch categories"
      );
    }
  }
);

export const fetchProducts = createAsyncThunk(
  "catalog/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchProductsApi();
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to fetch products"
      );
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "catalog/fetchProductById",
  async (id: string, { rejectWithValue }) => {
    try {
      return await fetchProductByIdApi(id);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to fetch product"
      );
    }
  }
);

export const filterProducts = createAsyncThunk(
  "catalog/filterProducts",
  async (filters: Record<string, unknown>, { rejectWithValue }) => {
    try {
      return await filterProductsApi(filters);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to filter products"
      );
    }
  }
);

export const toggleLike = createAsyncThunk(
  "catalog/toggleLike",
  async (
    productId: string,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      const userId = state.auth.user?.id ?? null;
      if (!userId) {
        return rejectWithValue("You must be logged in to like");
      }
      const { liked, count } = await toggleLikeApi(productId, userId);
      return { productId, userId, liked, count };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to toggle like"
      );
    }
  }
);

/* ─── Slice ─── */

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    clearSelectedProduct(state) {
      state.selectedProduct = null;
      state.selectedProductError = null;
    },
    updateProductLike(
      state,
      action: {
        payload: { productId: string; userId: string | null; liked: boolean; count: number };
      }
    ) {
      const { productId, userId, liked, count } = action.payload;
      const p = state.products.find((x) => x.id === productId);
      if (!p) return;
      p.likesCount = count;
      const ids = p.likedByUserIds ?? [];
      if (userId) {
        if (liked && !ids.includes(userId)) p.likedByUserIds = [...ids, userId];
        else if (!liked) p.likedByUserIds = ids.filter((id) => id !== userId);
      }
      if (state.selectedProduct?.id === productId) {
        state.selectedProduct.likesCount = count;
        state.selectedProduct.likedByUserIds = p.likedByUserIds;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      /* ── Categories ── */
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = (action.payload as string) ?? "Unknown error";
      })

      /* ── Products (all) ── */
      .addCase(fetchProducts.pending, (state) => {
        state.productsLoading = true;
        state.productsError = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.productsLoading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.productsLoading = false;
        state.productsError = (action.payload as string) ?? "Unknown error";
      })

      /* ── Product by ID ── */
      .addCase(fetchProductById.pending, (state) => {
        state.selectedProductLoading = true;
        state.selectedProductError = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.selectedProductLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.selectedProductLoading = false;
        state.selectedProductError = (action.payload as string) ?? "Unknown error";
      })

      /* ── Filter products ── */
      .addCase(filterProducts.pending, (state) => {
        state.productsLoading = true;
        state.productsError = null;
      })
      .addCase(filterProducts.fulfilled, (state, action) => {
        state.productsLoading = false;
        state.products = action.payload;
      })
      .addCase(filterProducts.rejected, (state, action) => {
        state.productsLoading = false;
        state.productsError = (action.payload as string) ?? "Unknown error";
      })

      .addCase(toggleLike.fulfilled, (state, action) => {
        const { productId, userId, liked, count } = action.payload;
        const p = state.products.find((x) => x.id === productId);
        if (!p) return;
        p.likesCount = count;
        const ids = p.likedByUserIds ?? [];
        if (userId) {
          if (liked && !ids.includes(userId)) p.likedByUserIds = [...ids, userId];
          else if (!liked) p.likedByUserIds = ids.filter((id) => id !== userId);
        }
        if (state.selectedProduct?.id === productId) {
          state.selectedProduct.likesCount = count;
          state.selectedProduct.likedByUserIds = p.likedByUserIds;
        }
      });
  },
});

export const { clearSelectedProduct, updateProductLike } = catalogSlice.actions;
export default catalogSlice.reducer;
