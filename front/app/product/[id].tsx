import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SLATE_400,
  SLATE_500,
  SURFACE,
  BORDER,
  BORDER_SUBTLE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchProductById, fetchProducts } from "@/store/features/catalog";
import { buildPhotoUrl } from "@/lib/utils";

function safeImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("/files/")) return buildPhotoUrl(raw);
  return null;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const productFromList = useAppSelector((state) =>
    state.catalog.products.find((p) => p.id === id)
  );
  const selectedProduct = useAppSelector((state) => state.catalog.selectedProduct);
  const loading = useAppSelector((state) => state.catalog.selectedProductLoading);
  const error = useAppSelector((state) => state.catalog.selectedProductError);

  const product = selectedProduct?.id === id ? selectedProduct : productFromList;

  useEffect(() => {
    if (id && !product) dispatch(fetchProductById(id));
  }, [id, product, dispatch]);

  if (!id) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>Missing product id</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY} />
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading && !product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading product…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <MaterialIcons name="error-outline" size={48} color={PRIMARY} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Product not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = product.images?.length ? safeImageUrl(product.images[0]) : null;
  const pat = product.patissiere;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={28} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.title}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <MaterialIcons name="cake" size={80} color={SLATE_400} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>
            {product.price != null ? `${product.price.toFixed(0)} MAD` : "—"}
          </Text>
          {pat && (
            <View style={styles.chefRow}>
              <Text style={styles.label}>By </Text>
              <Text style={styles.chefName}>{pat.name}</Text>
              {(pat.city ?? product.location) && (
                <Text style={styles.location}> · {pat.city ?? product.location}</Text>
              )}
            </View>
          )}
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}
          {(product.likesCount ?? 0) > 0 && (
            <View style={styles.meta}>
              <MaterialIcons name="favorite" size={16} color={PRIMARY} />
              <Text style={styles.metaText}>{product.likesCount} likes</Text>
            </View>
          )}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
    backgroundColor: SURFACE,
  },
  headerBack: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: SLATE_500 },
  errorText: { fontSize: 16, color: SLATE_500, textAlign: "center" },
  backBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { fontSize: 16, fontWeight: "600", color: PRIMARY },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  imageWrap: { width: "100%", height: 280, backgroundColor: BORDER_SUBTLE },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  body: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: TEXT_PRIMARY },
  price: { fontSize: 24, fontWeight: "700", color: PRIMARY, marginTop: 8 },
  chefRow: { flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap" },
  label: { fontSize: 14, color: SLATE_500 },
  chefName: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY },
  location: { fontSize: 14, color: SLATE_500 },
  description: { fontSize: 15, color: SLATE_500, lineHeight: 22, marginTop: 16 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  metaText: { fontSize: 14, color: SLATE_500 },
});
