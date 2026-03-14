import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Redirect } from "expo-router";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAppSelector } from "@/store/hooks";
import {
  BACKGROUND_LIGHT,
  TEXT_PRIMARY,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  PRIMARY,
  SURFACE,
  BORDER,
} from "@/constants/colors";
import { buildWorkspaceMapHtml, OSM_DEFAULT } from "@/lib/workspace-map-html";
import { buildPhotoUrl } from "@/lib/utils";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type TabKey = "Available" | "Accepted" | "Estimated";

const MOCK_ORDERS = [
  {
    id: "1",
    clientName: "Amélie Laurent",
    rating: "4.9",
    tag: "Premium Member",
    price: "€12.50",
    distance: "2.4 km away",
    items: "6x Strawberry Macarons, 1x Croissant",
    highlighted: true,
  },
  {
    id: "2",
    clientName: "Julien Bernard",
    rating: "4.7",
    tag: "Regular",
    price: "€8.90",
    distance: "1.1 km away",
    items: "2x Pain au Chocolat",
    highlighted: false,
  },
  {
    id: "3",
    clientName: "Sophie Morel",
    rating: "5.0",
    tag: "Favorite",
    price: "€15.20",
    distance: "4.8 km away",
    items: "",
    highlighted: false,
  },
];

const TAB_ICONS: Record<TabKey, keyof typeof MaterialIcons.glyphMap> = {
  Available: "inbox",
  Accepted: "check-circle",
  Estimated: "schedule",
};

const COLLAPSED_HEIGHT = 100;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

type OrderItem = (typeof MOCK_ORDERS)[number];

function BottomOrdersSheet({
  headerTop,
  activeTab,
  setActiveTab,
  orders,
  onViewOrderDetails,
}: {
  headerTop: number;
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  orders: OrderItem[];
  onViewOrderDetails?: (orderId: string) => void;
}) {
  const searchBarBottom = headerTop + 56 + 48 + 16;
  const halfHeight = SCREEN_HEIGHT * 0.45;
  const expandedHeight = SCREEN_HEIGHT - searchBarBottom;

  const sheetHeight = useSharedValue(halfHeight);
  const startHeight = useSharedValue(halfHeight);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startHeight.value = sheetHeight.value;
    })
    .onUpdate((e) => {
      const minH = COLLAPSED_HEIGHT;
      const maxH = Math.min(expandedHeight, SCREEN_HEIGHT - 80);
      const next = startHeight.value - e.translationY;
      sheetHeight.value = Math.min(maxH, Math.max(minH, next));
    })
    .onEnd((e) => {
      const current = sheetHeight.value;
      const mid = (COLLAPSED_HEIGHT + expandedHeight) / 2;
      let target = current;
      if (e.velocityY < -200) {
        if (current < mid) target = halfHeight;
        else target = expandedHeight;
      } else if (e.velocityY > 200) {
        if (current > mid) target = halfHeight;
        else target = COLLAPSED_HEIGHT;
      } else {
        const d1 = Math.abs(current - COLLAPSED_HEIGHT);
        const d2 = Math.abs(current - halfHeight);
        const d3 = Math.abs(current - expandedHeight);
        if (d1 <= d2 && d1 <= d3) target = COLLAPSED_HEIGHT;
        else if (d2 <= d3) target = halfHeight;
        else target = expandedHeight;
      }
      sheetHeight.value = withSpring(target, SPRING_CONFIG);
    });

  const animatedSheet = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.bottomSheet, animatedSheet]}>
        <View style={styles.dragHandle} />
        <View style={styles.tabsRow}>
          {(["Available", "Accepted", "Estimated"] as TabKey[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <MaterialIcons
                name={TAB_ICONS[tab]}
                size={18}
                color={activeTab === tab ? PRIMARY : SLATE_400}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
        <ScrollView
          style={styles.ordersScroll}
          contentContainerStyle={styles.ordersScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {orders.map((order) => (
            <View
              key={order.id}
              style={[styles.orderCard, order.highlighted && styles.orderCardHighlight]}
            >
              <View style={styles.orderRow}>
                <View style={styles.orderLeft}>
                  <View style={styles.orderAvatar} />
                  <View>
                    <Text style={styles.orderName}>{order.clientName}</Text>
                    <View style={styles.orderMeta}>
                      <MaterialIcons name="star" size={12} color={PRIMARY} />
                      <Text style={styles.orderMetaText}>
                        {order.rating} • {order.tag}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderPrice}>{order.price}</Text>
                  <Text style={styles.orderDistance}>{order.distance}</Text>
                </View>
              </View>
              <Pressable
                style={styles.viewDetailsBtn}
                onPress={() => onViewOrderDetails?.(order.id)}
              >
                <Text style={styles.viewDetailsBtnText}>View order details</Text>
                <MaterialIcons name="chevron-right" size={18} color={PRIMARY} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Livreur workspace — map (real OSM like register), header, search, controls, bottom sheet.
 */
export default function WorkspaceScreen() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("Available");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fullscreenProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const headerTop = insets.top + (Platform.OS === "ios" ? 8 : 12);

  const enterFullscreen = () => {
    fullscreenProgress.value = withTiming(
      1,
      { duration: 280 },
      (finished) => finished && runOnJS(setIsFullScreen)(true)
    );
  };
  const exitFullscreen = () => {
    setIsFullScreen(false);
    fullscreenProgress.value = withTiming(0, { duration: 280 });
  };

  const normalUIAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fullscreenProgress.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(fullscreenProgress.value, [0, 1], [0, -24]) }],
  }));
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fullscreenProgress.value,
    transform: [{ translateY: interpolate(fullscreenProgress.value, [0, 1], [-16, 0]) }],
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setUserLocation({ lat: OSM_DEFAULT.lat, lng: OSM_DEFAULT.lng });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) setUserLocation({ lat: OSM_DEFAULT.lat, lng: OSM_DEFAULT.lng });
      } finally {
        if (!cancelled) setLocationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  if (role !== "LIVREUR") {
    return <Redirect href="/(main)" />;
  }

  const lat = userLocation?.lat ?? OSM_DEFAULT.lat;
  const lng = userLocation?.lng ?? OSM_DEFAULT.lng;
  const mapHtml = buildWorkspaceMapHtml(lat, lng);
  const profilePhoto = buildPhotoUrl(user?.photo ?? null);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Map (full screen behind) */}
      <View style={styles.mapWrap}>
        {locationLoading ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading your location...</Text>
          </View>
        ) : (
          <WebView
            source={{ html: mapHtml }}
            style={styles.webview}
            scrollEnabled={false}
            javaScriptEnabled
            originWhitelist={["*"]}
          />
        )}
      </View>

      {/* Normal UI: header, search, controls, sheet, back — animated out when fullscreen */}
      <Animated.View
        style={[styles.normalUIWrap, normalUIAnimatedStyle]}
        pointerEvents={isFullScreen ? "none" : "box-none"}
      >
        <View style={[styles.header, { paddingTop: headerTop }]}>
          <View style={styles.avatarWrap}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={28} color={PRIMARY} />
              </View>
            )}
          </View>
          <Text style={styles.headerTitle}>Driver Workspace</Text>
          <Pressable style={styles.iconBtn} onPress={enterFullscreen}>
            <MaterialIcons name="fullscreen" size={22} color={PRIMARY} />
          </Pressable>
        </View>

        <View style={[styles.searchWrap, { top: headerTop + 56 }]}>
          <MaterialIcons name="search" size={20} color={SLATE_500} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search delivery location"
            placeholderTextColor={SLATE_400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.controlsWrap}>
          <View style={styles.zoomCard}>
            <Pressable style={styles.zoomBtn}>
              <MaterialIcons name="add" size={22} color={SLATE_600} />
            </Pressable>
            <Pressable style={styles.zoomBtn}>
              <MaterialIcons name="remove" size={22} color={SLATE_600} />
            </Pressable>
          </View>
          <Pressable style={styles.nearMeBtn}>
            <MaterialIcons name="near-me" size={24} color={PRIMARY} />
          </Pressable>
        </View>

        <BottomOrdersSheet
          headerTop={headerTop}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          orders={MOCK_ORDERS}
          onViewOrderDetails={(id) => router.push(`/(main)/delivery-order/${id}` as any)}
        />

        <Pressable style={[styles.backBtn, { top: headerTop + 4 }]} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
      </Animated.View>

      {/* Fullscreen overlay: fades in when entering fullscreen */}
      <Animated.View
        style={[styles.fullscreenOverlay, { paddingTop: headerTop }, overlayAnimatedStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.fullscreenBackBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
        <Pressable style={styles.fullscreenExitBtn} onPress={exitFullscreen}>
          <MaterialIcons name="fullscreen-exit" size={24} color={TEXT_PRIMARY} />
        </Pressable>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#94a3b8" },
  normalUIWrap: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  mapWrap: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: SLATE_600 },
  webview: { flex: 1, backgroundColor: "transparent" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(218,27,97,0.1)",
    zIndex: 20,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(218,27,97,0.1)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 80,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  controlsWrap: {
    position: "absolute",
    right: 16,
    top: 180,
    zIndex: 10,
    gap: 12,
  },
  zoomCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  zoomBtn: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(218,27,97,0.05)",
  },
  nearMeBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 25,
  },
  fullscreenBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenExitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    paddingTop: 12,
    paddingBottom: 24,
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
    overflow: "hidden",
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(218,27,97,0.2)",
    alignSelf: "center",
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(218,27,97,0.05)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: "600", color: SLATE_400 },
  tabTextActive: { fontWeight: "700", color: PRIMARY },
  ordersScroll: { flex: 1 },
  ordersScrollContent: { padding: 16, gap: 12 },
  orderCard: {
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  orderCardHighlight: {
    backgroundColor: "rgba(218,27,97,0.05)",
    borderColor: "rgba(218,27,97,0.1)",
  },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SLATE_400,
  },
  orderName: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  orderMetaText: { fontSize: 11, color: PRIMARY, fontWeight: "500" },
  orderRight: { alignItems: "flex-end" },
  orderPrice: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  orderDistance: { fontSize: 10, color: SLATE_500, marginTop: 2 },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.3)",
    backgroundColor: "rgba(218,27,97,0.06)",
  },
  viewDetailsBtnText: { fontSize: 13, fontWeight: "600", color: PRIMARY },
  backBtn: {
    position: "absolute",
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
  },
});
