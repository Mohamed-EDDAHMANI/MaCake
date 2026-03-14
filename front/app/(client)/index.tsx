import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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
  PRIMARY_TINT,
  TEXT_PRIMARY,
  FLOATING_TAB_BAR_BOTTOM_SAFE,
} from "@/constants/colors";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { fetchProducts, toggleLike } from "@/store/features/catalog";
import { ProfilePopup } from "@/components/common/profile-popup";
import { AppSidebar } from "@/components/common/app-sidebar";
import { CategoryBadge } from "@/components/common/category-badge";
import { ProductLikesBadge } from "@/components/common/product-likes-badge";
import { SearchBar } from "@/components/common/search-bar";
import { filterProductsBySearchQuery } from "@/lib/product-search";
import { buildPhotoUrl, getProfilePath } from "@/lib/utils";

function safeImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("/files/")) return buildPhotoUrl(raw);
  return null;
}

const FEATURED_CARD_WIDTH = 288;
const FEATURED_CARD_HEIGHT = 176;
const CHIP_GAP = 12;
const CARD_IMAGE_HEIGHT = 256;

const FEATURED_IMAGES = [
  {
    uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9pA_J8r4iOjA84wG9idDak8r_ZtM3u_nH3PNqRAfDzRjCW9dxN5gqtywcUl1ZXC7Jki-BgSA5RdkaG44Tlazt0KhalmnvpP2PycJyhY6NEji0oUQn351I5DoVl183Yuf53KgKMbWR0T04WswXZ4Sy9qEGvZWZwJm5y_AMYOYV7jkykuEBGyFxFlntogAK3FxFedNJaa8y-rgmsNnERgCm5Qmk2Pj3kJPzwrGRPHIdR-1rOvdTBAxIm9MIYn4iwwA9Tb6SixQuTtQ",
    title: "Midnight Truffle",
    chef: "Chef Isabella Rivera",
  },
  {
    uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuAME012O-EAxvj6rhADX80Uw4xEVNAcY4eMNXnxajcJeLUBxFKmKTWeiGxYHM_VaQfdsuFs4lpCfUKl3snh-nMDirTONyGC1Pw1CcmlW2pqgRwjFGs6SKUy3DL0YIhNBk1_Y262TNWx6P9go8ZL_3GwbG1tZjoa_OItQw44kWXuObGSS3EZuDmWLX1dCw3ciQiEUJ_EWECl1pRlZQ-GoqJLVMlVvSEM9-ZUVGg2pzglkPop2Y7LlxbmPE5PjaubsEOf8YhGR8s_OeM",
    title: "Blushing Peony Tier",
    chef: "Chef Marcus Chen",
  },
];

/** First card in "Trending Near You" — always shown as static. */
const STATIC_FIRST_TRENDING = {
  imageUri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHuAa0G2U1GczO9nZkijiKJCUUWvDVMotVt2X2oY3zt_Ayl6-89ugPoa2mYRp_RmMD8JzPdaZxNkUqsOhiji3Rk0DXReqsZTaSXxwTVG_LjsH8EqC-BOgXYqGPTUnVbyxMxjkX5JQmPRYSJAcqYQSUIiu8dGl7iQJFv1FpY279iYHWObTk6VOsrlGpOQqMt_jXv06_azg5gd50HjcgbR2rLK8PfAd7h1P9d9h8i9GSpgcDb7zOWrcNUqzHHrXKe8oocmuyGTVY0Q0",
  title: "Wild Strawberry Velour",
  location: "Paris, FR",
  price: "$85",
  chefName: "Chef Sophie Laurent",
  chefAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCzpCaVpNOQqDljOvjQEkIrS92XiCRy4rphkIZdacSbRd8Cd5gCn3GOMJlVDukJCUdtaf7GKwEY3oIBjsUZ3UieCQ65Hfb_wnpGN5Pzs0At7_1mAG0CNqaI5-sxTE_isbU-MjRajx6ofiz0embCMG2uu2xunxiXGXHgojNN_8gtJxv0MIF_H9MOxbtZ_x-76rcXsm0fRVepY-2IflnX8aTqSkq-6vfUlKeYfouXEC-5aKizz7JYZRqyKKu6Cujw81eBebzGzLWXWNA",
  rating: "4.9",
  isFav: true,
};

const CATEGORIES = ["All", "Birthday", "Wedding", "Chocolate", "Custom", "Kids"];

export default function ClientExploreScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showAuthModal } = useAuthModal();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { products, productsLoading, productsError } = useAppSelector((state) => state.catalog);
  const userPhoto = buildPhotoUrl(user?.photo);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const byCategory =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category?.name?.toLowerCase() === selectedCategory.toLowerCase());
  const filteredProducts = filterProductsBySearchQuery(byCategory, searchQuery);

  const openPopup = () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    setShowProfilePopup(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Fixed Header — outside ScrollView so touches always work when scrolled */}
      <View style={styles.headerContainer} pointerEvents="box-none">
        <BlurView
          intensity={45}
          tint="light"
          {...(Platform.OS === "android" ? { experimentalBlurMethod: "dimezisBlurView" } : {})}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={[styles.headerColorOverlay, { pointerEvents: "none" }]} />

        <View style={styles.header} pointerEvents="box-none">
          <Pressable style={styles.iconBtn} hitSlop={12} onPress={() => setSidebarOpen(true)}>
            <MaterialIcons name="menu" size={28} color={PRIMARY} />
          </Pressable>
          <Text style={styles.logo}>MaCake</Text>
          <Pressable style={[styles.iconBtn, styles.avatarBtn]} hitSlop={12} onPress={openPopup}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <MaterialIcons name="person" size={24} color={PRIMARY} />
            )}
          </Pressable>
        </View>

        <ProfilePopup
          visible={showProfilePopup}
          onClose={() => setShowProfilePopup(false)}
          profileRoute="/(main)/profile"
        />

        <AppSidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <View pointerEvents="box-none">
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          style={styles.chipsScrollView}
          pointerEvents="box-none"
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.chip, selectedCategory === cat ? styles.chipActive : styles.chipInactive]}
            >
              <Text style={[styles.chipText, selectedCategory === cat ? styles.chipTextActive : styles.chipTextInactive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Masterpieces</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {FEATURED_IMAGES.map((item, i) => (
              <View key={i} style={styles.featuredCard}>
                <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.featuredOverlay}>
                  <Text style={styles.featuredTitle}>{item.title}</Text>
                  <Text style={styles.featuredChef}>{item.chef}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Explore — first card static, then real products from Redux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Near You</Text>

          {/* Static first product — always shown */}
          <View style={styles.trendingCard}>
            <View style={styles.trendingImageWrap}>
              <Image source={{ uri: STATIC_FIRST_TRENDING.imageUri }} style={styles.trendingImage} contentFit="cover" />
              <Pressable style={styles.heartBtn}>
                <MaterialIcons name="favorite" size={22} color={STATIC_FIRST_TRENDING.isFav ? PRIMARY : PRIMARY + "66"} />
              </Pressable>
            </View>
            <View style={styles.trendingBody}>
              <View style={styles.trendingRow}>
                <View>
                  <Text style={styles.trendingTitle}>{STATIC_FIRST_TRENDING.title}</Text>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={14} color={SLATE_500} />
                    <Text style={styles.locationText}>{STATIC_FIRST_TRENDING.location}</Text>
                  </View>
                </View>
                <Text style={styles.price}>{STATIC_FIRST_TRENDING.price}</Text>
              </View>
              <View style={styles.trendingFooter}>
                <View style={styles.chefRow}>
                  <Image source={{ uri: STATIC_FIRST_TRENDING.chefAvatar }} style={styles.chefAvatar} contentFit="cover" />
                  <Text style={styles.chefName}>{STATIC_FIRST_TRENDING.chefName}</Text>
                </View>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={16} color="#eab308" />
                  <Text style={styles.ratingText}>{STATIC_FIRST_TRENDING.rating}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Rest: real products from Redux */}
          {productsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.loadingText}>Loading products…</Text>
            </View>
          ) : productsError ? (
            <View style={styles.loadingWrap}>
              <MaterialIcons name="error-outline" size={40} color={PRIMARY} />
              <Text style={styles.errorText}>{productsError}</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.loadingWrap}>
              <MaterialIcons name="cake" size={40} color={SLATE_400} />
              <Text style={styles.emptyText}>No more products in this category</Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const imageUri = product.images?.length ? safeImageUrl(product.images[0]) : null;
              const pat = product.patissiere;
              const isLiked = user?.id && (product.likedByUserIds ?? []).includes(user.id);
              return (
                <Pressable
                  key={product.id}
                  style={styles.trendingCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/product/[id]",
                      params: { id: String(product.id) },
                    } as any)
                  }
                >
                  <View style={styles.trendingImageWrap}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.trendingImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.trendingImage, styles.trendingImagePlaceholder]}>
                        <MaterialIcons name="cake" size={48} color={SLATE_400} />
                      </View>
                    )}
                    <CategoryBadge name={product.category?.name ?? ""} />
                    <Pressable
                      style={styles.heartBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (!user) {
                          showAuthModal();
                          return;
                        }
                        dispatch(toggleLike(product.id));
                      }}
                    >
                      <MaterialIcons
                        name="favorite"
                        size={22}
                        color={isLiked ? PRIMARY : SLATE_400}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.trendingBody}>
                    <View style={styles.trendingRow}>
                      <View style={styles.trendingRowLeft}>
                        <Text style={styles.trendingTitle} numberOfLines={1}>{product.title}</Text>
                        <View style={styles.locationRow}>
                          <MaterialIcons
                            name={product.location || product.patissiere?.city ? "location-on" : "category"}
                            size={14}
                            color={SLATE_500}
                          />
                          <Text style={styles.locationText}>
                            {product.location ?? product.patissiere?.city ?? product.category?.name ?? "—"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.price}>{product.price.toFixed(2)} MAD</Text>
                    </View>
                    <View style={styles.trendingFooter}>
                      <Pressable
                        style={styles.chefRow}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (!user) {
                            showAuthModal();
                            return;
                          }
                          if (pat?.id) {
                            router.push({
                              pathname: "/(main)/profile/[id]",
                              params: { id: String(pat.id) },
                            } as any);
                          }
                        }}
                      >
                        {pat?.photo ? (
                          <Image source={{ uri: safeImageUrl(pat.photo) ?? "" }} style={styles.chefAvatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.chefAvatar, styles.chefAvatarPlaceholder]}>
                            <MaterialIcons name="person" size={16} color={SLATE_400} />
                          </View>
                        )}
                        <Text style={styles.chefName} numberOfLines={1}>{pat?.name ?? "—"}</Text>
                      </Pressable>
                      <View style={styles.trendingMetaRow}>
                        <View style={styles.ratingRow}>
                          <MaterialIcons name="star" size={16} color="#eab308" />
                          <Text style={styles.ratingText}>{(pat?.rating ?? 0).toFixed(1)}</Text>
                        </View>
                        <ProductLikesBadge count={product.likesCount ?? 0} compact />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  headerContainer: { overflow: "hidden", borderBottomWidth: 1, borderBottomColor: BORDER },
  headerColorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255, 255, 255, 0.75)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  avatarBtn: {
    backgroundColor: PRIMARY_TINT,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    padding: 2,
    overflow: "hidden",
  },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  logo: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4, color: PRIMARY },
  chipsScrollView: { flexGrow: 0 },
  chipsScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: CHIP_GAP, flexDirection: "row" },
  chip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
  chipActive: { backgroundColor: PRIMARY },
  chipInactive: { backgroundColor: PRIMARY_TINT },
  chipText: { fontSize: 14 },
  chipTextActive: { color: SURFACE, fontWeight: "600" },
  chipTextInactive: { color: PRIMARY, fontWeight: "500" },
  main: { flex: 1 },
  mainContent: { paddingBottom: 24 + FLOATING_TAB_BAR_BOTTOM_SAFE },
  section: { paddingVertical: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY, marginBottom: 12 },
  featuredScroll: { flexDirection: "row", gap: 16 },
  featuredCard: { width: FEATURED_CARD_WIDTH, height: FEATURED_CARD_HEIGHT, borderRadius: 12, overflow: "hidden" },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", padding: 16 },
  featuredTitle: { fontSize: 16, fontWeight: "700", color: SURFACE },
  featuredChef: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  trendingCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  trendingImageWrap: { height: CARD_IMAGE_HEIGHT, position: "relative" },
  trendingImage: { width: "100%", height: "100%" },
  trendingImagePlaceholder: {
    backgroundColor: BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
  },
  heartBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  trendingBody: { padding: 16 },
  trendingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  trendingRowLeft: { flex: 1, minWidth: 0, marginRight: 12 },
  trendingTitle: { fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locationText: { fontSize: 14, color: SLATE_500 },
  price: { fontSize: 20, fontWeight: "700", color: PRIMARY },
  trendingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    gap: 10,
    minWidth: 0,
  },
  chefRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  chefAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: BORDER },
  chefAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  chefName: { fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY, flex: 1 },
  trendingMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: SLATE_500 },
  errorText: { marginTop: 8, fontSize: 14, color: PRIMARY, textAlign: "center" },
  emptyText: { marginTop: 8, fontSize: 14, color: SLATE_400 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
});
