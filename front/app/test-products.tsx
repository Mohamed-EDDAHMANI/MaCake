import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProducts } from "@/store/features/catalog";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SURFACE,
  BORDER,
  TEXT_PRIMARY,
  SLATE_400,
  SLATE_500,
  SLATE_700,
} from "@/constants/colors";
import { buildPhotoUrl } from "@/lib/utils";

/** Only treat as a valid image URL if it starts with http or /files/ */
function safeImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("/files/")) {
    return buildPhotoUrl(raw);
  }
  return null; // skip base64 blobs or garbage strings
}

export default function TestProductsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    products,
    productsLoading: loading,
    productsError: error,
  } = useAppSelector((state) => state.catalog);

  const loadProducts = useCallback(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={26} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Products Test</Text>
        <Pressable onPress={loadProducts} hitSlop={12}>
          <MaterialIcons name="refresh" size={26} color={PRIMARY} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {/* Debug banner — Redux state */}
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>
            Status: {loading ? "Loading..." : error ? "Error" : `${products.length} products`}
          </Text>
          <Text style={styles.debugRaw}>
            Source: Redux (catalog.products)
          </Text>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading products…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={48} color={PRIMARY} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <View style={styles.center}>
            <MaterialIcons name="inbox" size={48} color={SLATE_400} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        )}

        {/* Product cards */}
        {!loading &&
          products.map((product: any, idx: number) => {
            const id = product.id ?? product._id ?? `idx-${idx}`;
            const images = product.images ?? [];
            const thumb =
              images.length > 0 ? safeImageUrl(images[0]) : null;
            const pat = product.patissiere;

            return (
              <View key={id} style={styles.card}>
                {/* Product image */}
                {thumb ? (
                  <Image
                    source={{ uri: thumb }}
                    style={styles.cardImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                    <MaterialIcons name="cake" size={40} color={SLATE_400} />
                  </View>
                )}

                <View style={styles.cardBody}>
                  {/* Title + price */}
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                      {product.title ?? "Untitled"}
                    </Text>
                    <Text style={styles.price}>
                      {(product.price ?? 0).toFixed(2)} MAD
                    </Text>
                  </View>

                  {/* Description */}
                  {!!product.description && (
                    <Text style={styles.desc} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}

                  {/* Category */}
                  {(product.category?.name || product.categoryId?.name) && (
                    <View style={styles.tagRow}>
                      <MaterialIcons
                        name="category"
                        size={14}
                        color={SLATE_500}
                      />
                      <Text style={styles.tagText}>
                        {product.category?.name ?? product.categoryId?.name}
                      </Text>
                    </View>
                  )}

                  {/* Ingredients */}
                  {product.ingredients && product.ingredients.length > 0 && (
                    <View style={styles.tagRow}>
                      <MaterialIcons
                        name="restaurant"
                        size={14}
                        color={SLATE_500}
                      />
                      <Text style={styles.tagText} numberOfLines={1}>
                        {product.ingredients.join(", ")}
                      </Text>
                    </View>
                  )}

                  {/* Likes */}
                  <View style={styles.tagRow}>
                    <MaterialIcons
                      name="favorite"
                      size={14}
                      color={PRIMARY}
                    />
                    <Text style={styles.tagText}>
                      {product.likesCount ?? 0} like
                      {(product.likesCount ?? 0) !== 1 ? "s" : ""}
                    </Text>
                  </View>

                  {/* Patissiere info */}
                  {pat ? (
                    <View style={styles.patRow}>
                      {pat.photo ? (
                        <Image
                          source={{ uri: safeImageUrl(pat.photo) ?? "" }}
                          style={styles.patAvatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.patAvatar,
                            styles.patAvatarPlaceholder,
                          ]}
                        >
                          <MaterialIcons
                            name="person"
                            size={16}
                            color={SLATE_400}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patName}>
                          {pat.name ?? "Unknown"}
                        </Text>
                        <View style={styles.ratingRow}>
                          <MaterialIcons
                            name="star"
                            size={14}
                            color="#eab308"
                          />
                          <Text style={styles.ratingText}>
                            {(pat.rating ?? 0).toFixed(1)} (
                            {pat.ratingCount ?? 0})
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.patRow}>
                      <MaterialIcons
                        name="person-off"
                        size={16}
                        color={SLATE_400}
                      />
                      <Text style={[styles.tagText, { marginLeft: 4 }]}>
                        No patissiere info
                      </Text>
                    </View>
                  )}

                  {/* Meta */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>ID:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {id}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>PatissiereId:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {product.patissiereId ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Active:</Text>
                    <Text style={styles.metaValue}>
                      {product.isActive ? "Yes" : "No"}
                    </Text>
                  </View>
                  {product.createdAt && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Created:</Text>
                      <Text style={styles.metaValue}>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: { marginTop: 12, color: SLATE_500, fontSize: 14 },
  errorText: {
    marginTop: 12,
    color: PRIMARY,
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: { marginTop: 12, color: SLATE_400, fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },

  /* Debug */
  debugBanner: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  debugText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  debugRaw: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#78350f",
  },

  countBadge: {
    fontSize: 13,
    fontWeight: "600",
    color: SLATE_500,
    marginBottom: 12,
  },

  /* Card */
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: { width: "100%", height: 180 },
  cardImagePlaceholder: {
    backgroundColor: BACKGROUND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 14 },

  /* Title row */
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: { fontSize: 17, fontWeight: "700", color: TEXT_PRIMARY, flex: 1 },
  price: { fontSize: 16, fontWeight: "700", color: PRIMARY, marginLeft: 8 },

  desc: { fontSize: 13, color: SLATE_500, marginBottom: 8, lineHeight: 18 },

  /* Tags */
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  tagText: { fontSize: 13, color: SLATE_700, flex: 1 },

  /* Patissiere */
  patRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  patAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BORDER,
  },
  patAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  patName: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: { fontSize: 12, fontWeight: "600", color: SLATE_700 },

  /* Meta */
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: SLATE_400,
    width: 90,
  },
  metaValue: {
    fontSize: 11,
    color: SLATE_500,
    flex: 1,
  },
});
