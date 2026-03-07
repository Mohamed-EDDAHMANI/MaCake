import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SLATE_400,
  SLATE_500,
  SURFACE,
  BORDER,
  BORDER_SUBTLE,
  TEXT_PRIMARY,
  PRIMARY_TINT,
  FLOATING_TAB_BAR_BOTTOM_SAFE,
} from "@/constants/colors";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchProducts, fetchCategories, toggleLike } from "@/store/features/catalog";
import type { Product } from "@/store/features/catalog";
import { CategoryBadge } from "@/components/common/category-badge";
import { ProductLikesBadge } from "@/components/common/product-likes-badge";
import { SearchBar } from "@/components/common/search-bar";
import { filterProductsBySearchQuery } from "@/lib/product-search";
import { buildPhotoUrl } from "@/lib/utils";

function safeImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("/files/")) return buildPhotoUrl(raw);
  return null;
}

const CARD_ASPECT = 16 / 10;

export default function ClientFavoritesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { products, productsLoading, productsError, categories } = useAppSelector(
    (state) => state.catalog
  );

  const [selectedCategory, setSelectedCategory] = useState<string>("All Items");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  const likedProducts = useMemo(() => {
    if (!user?.id) return [];
    return products.filter((p) => (p.likedByUserIds ?? []).includes(user.id));
  }, [products, user?.id]);

  const filteredByCategory = useMemo(() => {
    if (selectedCategory === "All Items") return likedProducts;
    return likedProducts.filter(
      (p) =>
        (p.category?.name ?? "").toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [likedProducts, selectedCategory]);

  const filteredBySearch = useMemo(
    () => filterProductsBySearchQuery(filteredByCategory, searchQuery),
    [filteredByCategory, searchQuery]
  );

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.centered}>
          <MaterialIcons name="favorite-border" size={64} color={SLATE_400} />
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Log in to see your liked products</Text>
          <Pressable
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginBtnText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header: back, title, search */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Favorites</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => setShowSearchBar((v) => !v)}
          hitSlop={12}
        >
          <MaterialIcons name="search" size={24} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      {showSearchBar && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search favorites…"
          autoFocus
        />
      )}

      {/* Category tabs from DB */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <Pressable
            style={[
              styles.tab,
              selectedCategory === "All Items" && styles.tabActive,
            ]}
            onPress={() => setSelectedCategory("All Items")}
          >
            <Text
              style={[
                styles.tabText,
                selectedCategory === "All Items" && styles.tabTextActive,
              ]}
            >
              All Items
            </Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.tab,
                selectedCategory === (cat.name ?? "") && styles.tabActive,
              ]}
              onPress={() => setSelectedCategory(cat.name ?? "")}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedCategory === (cat.name ?? "") && styles.tabTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {productsLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : productsError ? (
          <View style={styles.loadingWrap}>
            <MaterialIcons name="error-outline" size={40} color={PRIMARY} />
            <Text style={styles.errorText}>{productsError}</Text>
          </View>
        ) : likedProducts.length === 0 ? (
          <View style={styles.centered}>
            <MaterialIcons name="favorite-border" size={64} color={SLATE_400} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.subtitle}>
              Like products on Explore to see them here
            </Text>
            <Pressable
              style={styles.exploreBtn}
              onPress={() => router.replace("/(main)" as any)}
            >
              <Text style={styles.exploreBtnText}>Explore</Text>
            </Pressable>
          </View>
        ) : filteredBySearch.length === 0 ? (
          <View style={styles.centered}>
            <MaterialIcons name="search-off" size={48} color={SLATE_400} />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? "No matches for your search"
                : `No items in "${selectedCategory}"`}
            </Text>
            <Text style={styles.subtitle}>
              {searchQuery.trim()
                ? "Try another term or category"
                : "You have no favorites in this category"}
            </Text>
          </View>
        ) : (
          filteredBySearch.map((product: Product) => {
            const imageUri = product.images?.length
              ? safeImageUrl(product.images[0])
              : null;
            const pat = product.patissiere;
            const rating = pat?.rating ?? 0;
            const ratingCount = pat?.ratingCount ?? 0;
            return (
              <View key={product.id} style={styles.card}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/product/[id]",
                      params: { id: String(product.id) },
                    } as any)
                  }
                  style={styles.cardImageWrap}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <MaterialIcons name="cake" size={48} color={SLATE_400} />
                    </View>
                  )}
                  <CategoryBadge name={product.category?.name ?? ""} />
                  <Pressable
                    style={styles.heartBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      dispatch(toggleLike(product.id));
                    }}
                  >
                    <MaterialIcons name="favorite" size={24} color={PRIMARY} />
                  </Pressable>
                </Pressable>
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardTitleBlock}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {product.title}
                      </Text>
                      <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={14} color="#eab308" />
                        <Text style={styles.ratingText}>
                          {rating.toFixed(1)}
                        </Text>
                        <Text style={styles.reviewCount}>
                          ({ratingCount} reviews)
                        </Text>
                        <ProductLikesBadge count={product.likesCount ?? 0} compact />
                      </View>
                    </View>
                    <Text style={styles.price}>
                      {product.price != null
                        ? `${product.price.toFixed(2)} MAD`
                        : "—"}
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.chefBlock}>
                      {pat?.photo ? (
                        <Image
                          source={{ uri: safeImageUrl(pat.photo) ?? "" }}
                          style={styles.chefAvatar}
                        />
                      ) : (
                        <View style={[styles.chefAvatar, styles.chefAvatarPlaceholder]}>
                          <MaterialIcons name="person" size={18} color={SLATE_400} />
                        </View>
                      )}
                      <View style={styles.chefInfo}>
                        <Text style={styles.chefName} numberOfLines={1}>
                          {pat?.name ?? "—"}
                        </Text>
                        <View style={styles.chefMetaRow}>
                          {pat?.city ? (
                            <Text style={styles.chefMeta} numberOfLines={1}>
                              {pat.city} •{" "}
                            </Text>
                          ) : null}
                          <MaterialIcons name="star" size={12} color="#eab308" />
                          <Text style={styles.chefMeta}>
                            {" "}{rating.toFixed(1)} Rating
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      style={styles.orderBtn}
                      onPress={() =>
                      router.push({
                        pathname: "/(main)/product/[id]",
                        params: { id: String(product.id) },
                      } as any)
                    }
                    >
                      <Text style={styles.orderBtnText}>Order Now</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_TINT,
    backgroundColor: BACKGROUND_LIGHT,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_TINT,
    backgroundColor: BACKGROUND_LIGHT,
  },
  tabsScroll: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 24,
    paddingVertical: 12,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: SLATE_500,
  },
  tabTextActive: { fontWeight: "700", color: PRIMARY },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 + FLOATING_TAB_BAR_BOTTOM_SAFE, gap: 24 },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  loadingText: { marginTop: 12, fontSize: 14, color: SLATE_500 },
  errorText: { marginTop: 8, fontSize: 14, color: PRIMARY, textAlign: "center" },
  centered: {
    paddingVertical: 48,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: { fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY },
  subtitle: { fontSize: 14, color: SLATE_500, marginTop: 8, textAlign: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: TEXT_PRIMARY, marginTop: 16 },
  loginBtn: {
    marginTop: 24,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  exploreBtn: {
    marginTop: 24,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  exploreBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: PRIMARY_TINT,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: CARD_ASPECT,
    position: "relative",
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    backgroundColor: BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 16, gap: 12 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleBlock: { flex: 1, marginRight: 12, minWidth: 0 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  ratingText: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  reviewCount: { fontSize: 12, color: SLATE_400 },
  price: { fontSize: 20, fontWeight: "800", color: PRIMARY },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PRIMARY_TINT,
  },
  chefBlock: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  chefAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BORDER_SUBTLE,
  },
  chefAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  chefInfo: { flex: 1, minWidth: 0 },
  chefName: { fontSize: 12, fontWeight: "700", color: TEXT_PRIMARY },
  chefMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 2,
  },
  chefMeta: { fontSize: 10, color: SLATE_500 },
  orderBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  orderBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
