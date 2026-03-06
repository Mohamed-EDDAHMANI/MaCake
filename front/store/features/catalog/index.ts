export { default as catalogReducer } from "./catalogSlice";
export {
  fetchCategories,
  fetchProducts,
  fetchProductById,
  filterProducts,
  toggleLike,
  clearSelectedProduct,
  updateProductLike,
} from "./catalogSlice";
export type { CatalogState, Category, Product, PatissiereInfo } from "./catalogSlice";
export {
  fetchCategoriesApi,
  fetchProductsApi,
  fetchProductByIdApi,
  filterProductsApi,
} from "./catalogApi";
