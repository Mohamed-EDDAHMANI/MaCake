/**
 * Product detail inside (main) stack — works from Explore and Favorites.
 * Renders the same ProductDetailScreen; id comes from useLocalSearchParams in the screen.
 */
import ProductDetailScreen from "@/components/ProductDetailScreen";
export default function MainProductDetailRoute() {
  return <ProductDetailScreen />;
}
