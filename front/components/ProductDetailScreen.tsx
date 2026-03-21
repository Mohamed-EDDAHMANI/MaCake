import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SURFACE,
  BORDER_SUBTLE,
  TEXT_PRIMARY,
  PRIMARY_TINT,
} from "@/constants/colors";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { fetchProductById, toggleLike, clearSelectedProduct } from "@/store/features/catalog";
import { toggleFollow } from "@/store/features/follow";
import { addItem } from "@/store/features/cart/cartSlice";
import { buildPhotoUrl } from "@/lib/utils";
import { getRatingSocket, type RatingCreatedPayload } from "@/lib/rating-socket";
import OrderSuccessPopup from "@/components/product-detail/OrderSuccessPopup";
import OrderCustomizerPopup from "@/components/product-detail/OrderCustomizerPopup";

const HERO_HEIGHT = 400;
const STAR_YELLOW = "#eab308";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ColorOption = {
  id: string;
  label: string;
  hex: string;
};

const COLOR_OPTIONS: ColorOption[] = [
  { id: "strawberry-pink", label: "Strawberry Pink", hex: "#D81B60" },
  { id: "gold", label: "Royal Gold", hex: "#FFD700" },
  { id: "rose-blush", label: "Rose Blush", hex: "#F4C2C2" },
  { id: "pure-white", label: "Pure White", hex: "#FFFFFF" },
  { id: "chocolate-brown", label: "Chocolate Brown", hex: "#4A2C2A" },
  { id: "coral", label: "Coral", hex: "#FF6B6B" },
  { id: "sunset-orange", label: "Sunset Orange", hex: "#FF8C00" },
  { id: "violet", label: "Velvet Violet", hex: "#8A2BE2" },
  { id: "mint", label: "Mint Green", hex: "#00B894" },
  { id: "ocean", label: "Ocean Blue", hex: "#0984E3" },
  { id: "rose", label: "Rose Candy", hex: "#FF69B4" },
  { id: "lime", label: "Fresh Lime", hex: "#A3CB38" },
];

const GARNISH_OPTIONS = [
  { id: "rose", icon: "local-florist" as const, label: "Rose Petals" },
  { id: "gold", icon: "star" as const, label: "Gold Flakes" },
  { id: "pearls", icon: "cake" as const, label: "Sugar Pearls" },
  { id: "mint", icon: "spa" as const, label: "Mint Sprig" },
  { id: "berries", icon: "emoji-food-beverage" as const, label: "Fresh Berries" },
  { id: "choco", icon: "icecream" as const, label: "Chocolate Shards" },
];

const MAX_GARNISHES = 3;

function safeImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http") || raw.startsWith("/files/")) return buildPhotoUrl(raw);
  return null;
}

function formatLikes(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? undefined;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showAuthModal } = useAuthModal();
  const user = useAppSelector((state) => state.auth.user);
  const cartItems = useAppSelector((state) => state.cart.items);
  const productFromList = useAppSelector((state) =>
    state.catalog.products.find((p) => String(p.id) === String(id))
  );
  const selectedProduct = useAppSelector((state) => state.catalog.selectedProduct);
  const loading = useAppSelector((state) => state.catalog.selectedProductLoading);
  const error = useAppSelector((state) => state.catalog.selectedProductError);
  const isProductInCart = useMemo(
    () => cartItems.some((item) => String(item.productId) === String(id)),
    [cartItems, id]
  );

  const product = selectedProduct?.id === id ? selectedProduct : productFromList;
  const isLiked = user?.id && (product?.likedByUserIds ?? []).includes(user.id);
  const insets = useSafeAreaInsets();
  const followStatus = useAppSelector((state) =>
    product?.patissiere?.id ? state.follow.statusByPatissiere[product.patissiere.id] : undefined
  );
  const followLoading = useAppSelector((state) => state.follow.followLoading);

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [id]);

  // Real-time: refetch when this product or its patissiere is rated
  useEffect(() => {
    if (!id) return;
    const socket = getRatingSocket();
    const handler = (payload: RatingCreatedPayload) => {
      const patissiereId = product?.patissiere?.id;
      if (payload.productId === id || (patissiereId && payload.toUserId === patissiereId)) {
        dispatch(fetchProductById(id));
      }
    };
    socket.on("rating.created", handler);
    return () => {
      socket.off("rating.created", handler);
    };
  }, [id, product?.patissiere?.id]);

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

  const imageUris = useMemo(() => {
    const arr = product.images ?? [];
    return arr.map((raw) => safeImageUrl(raw)).filter((u): u is string => u != null);
  }, [product.images]);
  const hasImages = imageUris.length > 0;
  const imageCount = hasImages ? imageUris.length : 1;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroScrollRef = useRef<ScrollView>(null);

  const onHeroScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / SCREEN_WIDTH);
      setCurrentImageIndex(Math.min(Math.max(0, index), imageCount - 1));
    },
    [imageCount]
  );

  const activeDotIndex = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(activeDotIndex, {
      toValue: currentImageIndex,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start();
  }, [currentImageIndex, activeDotIndex]);

  const pat = product.patissiere;
  const rating = pat?.rating ?? 0;
  const ratingCount = pat?.ratingCount ?? 0;
  const likesCount = product.likesCount ?? 0;
  const categoryName = product.category?.name?.toUpperCase() ?? "";

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerStep, setCustomizerStep] = useState<"choice" | "full">("choice");
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string>(COLOR_OPTIONS[0].id);
  const [selectedGarnishes, setSelectedGarnishes] = useState<string[]>([]);
  const [specialMessage, setSpecialMessage] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;
  const FADE_SCROLL_RANGE = 100;
  const [iconsTappable, setIconsTappable] = useState(true);

  const topIconsOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, FADE_SCROLL_RANGE],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [scrollY]
  );

  const onScrollNative = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setIconsTappable(y <= FADE_SCROLL_RANGE * 0.8);
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: onScrollNative }
  );

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // KEY TRICK: the hero block lives inside the vertical ScrollView (so vertical
  // swipes on it are caught by the outer scroll), but we counter-translate it
  // by +scrollY so it visually stays pinned to the top of the screen.
  // The inner horizontal ScrollView still gets horizontal swipe events normally.
  const heroTranslateY = scrollY;

  const openCustomizer = () => {
    setCustomizerStep("choice");
    setIsCustomizerOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  };

  const closeCustomizer = () => {
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 0,
    }).start(({ finished }) => {
      if (finished) {
        setIsCustomizerOpen(false);
        setCustomizerStep("choice");
      }
    });
  };

  const toggleGarnish = (id: string) => {
    setSelectedGarnishes((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((g) => g !== id);
      if (prev.length >= MAX_GARNISHES) return prev;
      return [...prev, id];
    });
  };

  const totalPrice = useMemo(() => {
    const base = product.price ?? 0;
    // Simple example: each garnish adds a small extra
    const extras = selectedGarnishes.length * 5;
    return base + extras;
  }, [product.price, selectedGarnishes.length]);

  const firstImageUri = imageUris[0];

  const showOrderSuccess = () => {
    setShowSuccess(true);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
      successTimeoutRef.current = null;
    }, 1600);
  };

  const handleSkipCustomization = () => {
    dispatch(
      addItem({
        productId: String(product.id),
        patissiereId: product.patissiereId || product.patissiere?.id || undefined,
        patissiereAddress: product.patissiere?.address || undefined,
        patissiereLatitude: product.patissiere?.latitude ?? null,
        patissiereLongitude: product.patissiere?.longitude ?? null,
        title: product.title,
        price: product.price ?? 0,
        quantity: 1,
        imageUri: firstImageUri,
        colors: undefined,
        garnish: undefined,
        message: undefined,
      })
    );
    closeCustomizer();
    showOrderSuccess();
  };

  const handleAddCustomizedToCart = () => {
    const garnishLabel = selectedGarnishes
      .map((id) => GARNISH_OPTIONS.find((g) => g.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    const selectedColorLabel =
      COLOR_OPTIONS.find((c) => c.id === selectedColorId)?.label;

    dispatch(
      addItem({
        productId: String(product.id),
        patissiereId: product.patissiereId || product.patissiere?.id || undefined,
        patissiereAddress: product.patissiere?.address || undefined,
        patissiereLatitude: product.patissiere?.latitude ?? null,
        patissiereLongitude: product.patissiere?.longitude ?? null,
        title: product.title,
        price: totalPrice,
        quantity: 1,
        imageUri: firstImageUri,
        colors: selectedColorLabel || undefined,
        garnish: garnishLabel || undefined,
        message: specialMessage || undefined,
      })
    );
    closeCustomizer();
    showOrderSuccess();
  };

  return (
    <View style={styles.safe} key={id}>
      {/* Top icons – fixed above everything; fade out on scroll */}
      <Animated.View
        style={[
          styles.heroActionsOverlay,
          { paddingTop: insets.top + 6, paddingHorizontal: 10 },
          { opacity: topIconsOpacity },
        ]}
        pointerEvents={iconsTappable ? "auto" : "none"}
      >
        <View style={styles.heroActionsRow}>
          <Pressable style={styles.heroBtnSmall} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.heroRight}>
            <Pressable style={styles.heroBtnSmall}>
              <MaterialIcons name="share" size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.heroBtnSmall}
              onPress={() => {
                if (!user) { showAuthModal(); return; }
                dispatch(toggleLike(product.id));
              }}
            >
              <MaterialIcons name="favorite" size={20} color={isLiked ? PRIMARY : "#fff"} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/*
          Hero block is INSIDE the vertical scroll, but translateY cancels the
          scroll offset so images appear fixed. The horizontal ScrollView inside
          still handles swipe-X independently — no gesture conflict.
        */}
        <Animated.View
          style={[styles.heroBlock, { transform: [{ translateY: heroTranslateY }] }]}
        >
          <ScrollView
            ref={heroScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onHeroScroll}
            onScroll={onHeroScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={styles.heroScroll}
            contentContainerStyle={styles.heroScrollContent}
          >
            {hasImages ? (
              imageUris.map((uri, i) => (
                <View key={i} style={[styles.heroSlide, { width: SCREEN_WIDTH }]}>
                  <Image source={{ uri }} style={styles.heroImage} contentFit="cover" />
                </View>
              ))
            ) : (
              <View style={[styles.heroSlide, { width: SCREEN_WIDTH }]}>
                <View style={[styles.heroImage, styles.heroPlaceholder]}>
                  <MaterialIcons name="cake" size={80} color={SLATE_400} />
                </View>
              </View>
            )}
          </ScrollView>
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.2)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.paginationWrap} pointerEvents="none">
            <Text style={styles.paginationCount}>
              {currentImageIndex + 1} / {imageCount}
            </Text>
            <View style={styles.paginationDotsCenter}>
              <View style={styles.paginationDots}>
                {Array.from({ length: imageCount }).map((_, i) => {
                  const scale = activeDotIndex.interpolate({
                    inputRange: [i - 0.5, i, i + 0.5],
                    outputRange: [1, 1.25, 1],
                    extrapolate: "clamp",
                  });
                  const opacity = activeDotIndex.interpolate({
                    inputRange: [i - 0.5, i, i + 0.5],
                    outputRange: [0.5, 1, 0.5],
                    extrapolate: "clamp",
                  });
                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.paginationDot,
                        {
                          opacity,
                          transform: [{ scale }],
                          backgroundColor:
                            currentImageIndex === i ? PRIMARY : "rgba(255,255,255,0.6)",
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Content card – scrolls up over the pinned hero */}
        <View style={styles.contentCard}>
          {categoryName ? (
            <View style={styles.tagsRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{categoryName}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {product.title}
            </Text>
            <Text style={styles.price}>
              {product.price != null ? `${product.price.toFixed(2)} MAD` : "—"}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={18} color={STAR_YELLOW} />
              <Text style={styles.statValue}>{(rating || 0).toFixed(1)}</Text>
              <Text style={styles.statMeta}>({ratingCount} reviews)</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="favorite" size={18} color={PRIMARY} />
              <Text style={styles.statValue}>{formatLikes(likesCount)}</Text>
            </View>
          </View>

          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DESCRIPTION</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {pat && (
            <View style={styles.chefCard}>
              {/* Header accent strip */}
              <LinearGradient
                colors={[PRIMARY_TINT, "transparent"]}
                style={styles.chefCardAccent}
                pointerEvents="none"
              />
              <Pressable
                style={styles.chefCardRow}
                onPress={() => {
                  if (!user) { showAuthModal(); return; }
                  if (pat?.id)
                    router.push({ pathname: "/(main)/profile/[id]", params: { id: String(pat.id) } } as any);
                }}
              >
                <View style={styles.chefMain}>
                  {/* Avatar with ring */}
                  <View style={styles.chefAvatarRing}>
                    <View style={styles.chefAvatarWrap}>
                      {pat.photo ? (
                        <Image
                          source={{ uri: safeImageUrl(pat.photo) ?? "" }}
                          style={styles.chefAvatar}
                        />
                      ) : (
                        <View style={[styles.chefAvatar, styles.chefAvatarPlaceholder]}>
                          <MaterialIcons name="person" size={28} color={SLATE_400} />
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.chefInfo}>
                    <Text style={styles.chefLabel}>CREATED BY</Text>
                    <Text style={styles.chefName}>{pat.name}</Text>
                    {pat.city ? (
                      <View style={styles.chefLocationRow}>
                        <View style={styles.chefLocationInner}>
                          <MaterialIcons name="location-on" size={11} color={SLATE_500} />
                          <Text style={styles.chefLocation}>{pat.city}</Text>
                        </View>
                        <Pressable
                          style={[
                            styles.chefFollowBtn,
                            followStatus?.following && styles.chefFollowBtnFollowing,
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              showAuthModal();
                              return;
                            }
                            dispatch(toggleFollow(pat.id));
                          }}
                          disabled={followLoading}
                        >
                          {followLoading ? (
                            <ActivityIndicator
                              size="small"
                              color={followStatus?.following ? SLATE_600 : PRIMARY}
                            />
                          ) : (
                            <>
                              <MaterialIcons
                                name={followStatus?.following ? "check" : "person-add"}
                                size={13}
                                color={followStatus?.following ? "#fff" : "#fff"}
                              />
                              <Text
                                style={[
                                  styles.chefFollowText,
                                  followStatus?.following && styles.chefFollowTextFollowing,
                                ]}
                              >
                                {followStatus?.following ? "Following" : "Follow"}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Chat button */}
                <Pressable style={styles.chatBtn} onPress={(e) => e.stopPropagation()}>
                  <MaterialIcons name="chat-bubble-outline" size={18} color={PRIMARY} />
                </Pressable>
              </Pressable>

              {/* Divider */}
              <View style={styles.chefDivider} />

              {/* Footer */}
              <View style={styles.chefCardFooter}>
                <View style={styles.creatorRatingRow}>
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={12} color="#fff" />
                    <Text style={styles.ratingBadgeText}>{(rating || 0).toFixed(1)}</Text>
                  </View>
                  <Text style={styles.creatorRatingText}>Creator Rating</Text>
                </View>
                <Pressable
                  style={styles.viewPortfolioBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!user) { showAuthModal(); return; }
                    if (pat?.id)
                      router.push({ pathname: "/(main)/profile/[id]", params: { id: String(pat.id) } } as any);
                  }}
                >
                  <Text style={styles.viewPortfolio}>Portfolio</Text>
                  <MaterialIcons name="arrow-forward-ios" size={10} color={PRIMARY} />
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
            <View style={styles.highlightsGrid}>
              <View style={styles.highlightItem}>
                <View style={styles.highlightIconWrap}>
                  <MaterialIcons name="eco" size={20} color={PRIMARY} />
                </View>
                <Text style={styles.highlightText}>Organic Ingredients</Text>
              </View>
              <View style={styles.highlightItem}>
                <View style={styles.highlightIconWrap}>
                  <MaterialIcons name="schedule" size={20} color={PRIMARY} />
                </View>
                <Text style={styles.highlightText}>Freshly Made</Text>
              </View>
            </View>
          </View>

        </View>
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Fixed bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <View style={styles.bottomLeft}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>
            {product.price != null ? `${product.price.toFixed(2)} MAD` : "—"}
          </Text>
        </View>
        <Pressable
          style={[styles.orderBtn, isProductInCart && styles.orderBtnAdded]}
          onPress={isProductInCart ? undefined : openCustomizer}
          disabled={isProductInCart}
        >
          <Text style={styles.orderBtnText}>{isProductInCart ? "Added" : "Order Now"}</Text>
          <MaterialIcons
            name={isProductInCart ? "shopping-cart" : "arrow-forward"}
            size={20}
            color="#fff"
          />
        </Pressable>
      </View>

      <OrderCustomizerPopup
        isOpen={isCustomizerOpen}
        step={customizerStep}
        sheetAnim={sheetAnim}
        colorOptions={COLOR_OPTIONS}
        garnishOptions={GARNISH_OPTIONS}
        selectedColorId={selectedColorId}
        selectedGarnishes={selectedGarnishes}
        specialMessage={specialMessage}
        totalPrice={totalPrice}
        bottomInset={insets.bottom}
        onClose={closeCustomizer}
        onSkip={handleSkipCustomization}
        onChooseCustomize={() => setCustomizerStep("full")}
        onSelectColor={setSelectedColorId}
        onToggleGarnish={toggleGarnish}
        onChangeMessage={setSpecialMessage}
        onAddToCart={handleAddCustomizedToCart}
      />

      <OrderSuccessPopup visible={showSuccess} message="Order added successfully" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: SLATE_500 },
  errorText: { fontSize: 16, color: SLATE_500, textAlign: "center" },
  backBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { fontSize: 16, fontWeight: "600", color: PRIMARY },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroBlock: {
    width: "100%",
    height: HERO_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  heroScroll: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroScrollContent: {
    flexDirection: "row",
  },
  heroSlide: {
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    backgroundColor: BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
  },
  heroActionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  heroRight: { flexDirection: "row", gap: 6 },
  paginationWrap: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  paginationDotsCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  paginationDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paginationCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
  },
  contentCard: {
    marginTop: -32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: BACKGROUND_LIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: "relative",
    zIndex: 2,
  },
  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: PRIMARY_TINT,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    lineHeight: 30,
  },
  price: { fontSize: 24, fontWeight: "700", color: PRIMARY },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 12,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statValue: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY },
  statMeta: { fontSize: 14, color: SLATE_500 },
  section: { marginTop: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 2,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: SLATE_600,
    lineHeight: 22,
  },

  // ─── Chef Card — modernized ───────────────────────────────────────────────
  chefCard: {
    marginTop: 32,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 5 },
    }),
  },
  // Subtle tinted gradient strip across the top of the card
  chefCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chefCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  chefMain: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  // Outer ring around the avatar
  chefAvatarRing: {
    padding: 2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  chefAvatarWrap: {},
  chefAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BORDER_SUBTLE,
  },
  chefAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  chefInfo: { flex: 1, minWidth: 0 },
  chefLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: SLATE_400,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  chefName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  chefLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
  },
  chefLocationInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  chefLocation: { fontSize: 11, color: SLATE_500 },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY_TINT,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  // Thin separator
  chefDivider: {
    height: 1,
    backgroundColor: BORDER_SUBTLE,
    marginHorizontal: 16,
  },
  chefCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  creatorRatingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Pill badge for the star rating
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: STAR_YELLOW,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  creatorRatingText: {
    fontSize: 12,
    fontWeight: "500",
    color: SLATE_500,
  },
  // Follow button — solid PRIMARY fill
  chefFollowBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    gap: 4,
  },
  chefFollowBtnFollowing: {
    backgroundColor: SLATE_400,
  },
  chefFollowText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  chefFollowTextFollowing: {
    color: "#fff",
  },
  // Portfolio link with trailing arrow
  viewPortfolioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewPortfolio: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  // ─── End Chef Card ────────────────────────────────────────────────────────

  highlightsGrid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  highlightItem: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: BORDER_SUBTLE,
  },
  highlightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: PRIMARY_TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightText: { fontSize: 12, fontWeight: "500", color: TEXT_PRIMARY },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  bottomLeft: {},
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: SLATE_500,
    letterSpacing: 1,
  },
  totalPrice: { fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 2 },
  orderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  orderBtnAdded: {
    backgroundColor: "#64748b",
  },
  orderBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});