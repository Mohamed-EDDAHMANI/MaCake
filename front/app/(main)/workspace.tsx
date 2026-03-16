import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Redirect } from "expo-router";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAppSelector } from "@/store/hooks";
import {
  BACKGROUND_LIGHT,
  TEXT_PRIMARY,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  PRIMARY,
  PRIMARY_05,
  SURFACE,
  BORDER,
  BORDER_SUBTLE,
} from "@/constants/colors";
import { buildWorkspaceMapHtml, OSM_DEFAULT, type MapMarker } from "@/lib/workspace-map-html";
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
import {
  getAvailableEstimationsForDeliveryApi,
  getAcceptedEstimationsForDeliveryApi,
  getEstimatedEstimationsForDeliveryApi,
  getDeliveredEstimationsForDeliveryApi,
  confirmEstimationApi,
  type AvailableEstimationForDelivery,
} from "@/store/features/estimation";
import { getProfileById } from "@/store/features/auth/authApi";
import { getOrderSocket } from "@/lib/order-socket";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";
import { EstimationCreateModal } from "@/components/order/EstimationCreateModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type TabKey = "Available" | "Accepted" | "Estimated" | "Historic";

/** Rough distance in km (haversine approximation) */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const TAB_ICONS: Record<TabKey, keyof typeof MaterialIcons.glyphMap> = {
  Available: "inbox",
  Accepted: "check-circle",
  Estimated: "schedule",
  Historic: "history",
};

const COLLAPSED_HEIGHT = 100;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

const FALLBACK_ITEM_IMAGE =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=200&auto=format&fit=crop";

export type WorkspaceOrderItem = {
  id: string;
  estimationId?: string;
  clientName: string;
  clientPhoto: string | null;
  rating: string;
  /** Location label (e.g. city) for display instead of distance */
  locationLabel: string;
  tag: string;
  patissiereName: string;
  patissierePhoto: string | null;
  deliveryName: string;
  deliveryPhoto: string | null;
  price: string;
  distance: string;
  items: string;
  itemImageUrls: string[];
  highlighted: boolean;
  /** Payment status for delivery to see on the card */
  paymentStatus: "Paid" | "Not paid yet";
  /** Order status (e.g. to show Done when delivered in Accepted tab) */
  orderStatus?: string;
};

function BottomOrdersSheet({
  headerTop,
  activeTab,
  setActiveTab,
  orders,
  selectedOrderIdForMap,
  onCardPressForMap,
  onViewOrder,
  onConfirmOrder,
  onOpenEstimationModal,
  loading,
  floatingAddButtonVisible,
  onFloatingAddPress,
}: {
  headerTop: number;
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  orders: WorkspaceOrderItem[];
  selectedOrderIdForMap: string | null;
  onCardPressForMap?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onConfirmOrder?: (orderId: string, estimationId?: string) => void;
  onOpenEstimationModal?: (orderId: string) => void;
  loading?: boolean;
  floatingAddButtonVisible?: boolean;
  onFloatingAddPress?: () => void;
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
        {floatingAddButtonVisible && onFloatingAddPress ? (
          <Pressable
            style={styles.floatingAddBtn}
            onPress={onFloatingAddPress}
          >
            <MaterialIcons name="add" size={28} color="#fff" />
          </Pressable>
        ) : null}
        <View style={styles.bottomSheetInner}>
        <View style={styles.dragHandle} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {(["Available", "Accepted", "Estimated", "Historic"] as TabKey[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <MaterialIcons
                name={TAB_ICONS[tab]}
                size={16}
                color={activeTab === tab ? PRIMARY : SLATE_400}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]} numberOfLines={1}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.ordersScrollWrap}>
          <ScrollView
            style={styles.ordersScroll}
            contentContainerStyle={styles.ordersScrollContent}
            showsVerticalScrollIndicator={false}
          >
          {loading ? (
            <View style={styles.ordersLoading}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={styles.ordersLoadingText}>Loading available requests...</Text>
            </View>
          ) : (
            orders.map((order) => {
              const isSelected = order.highlighted || selectedOrderIdForMap === order.id;
              return (
              <Pressable
                key={order.id}
                style={[
                  styles.orderCard,
                  isSelected && styles.orderCardHighlight,
                ]}
                onPress={() => onCardPressForMap?.(order.id)}
              >
                {/* Row: customer avatar + name/rating + price */}
                <View style={styles.orderRow}>
                  <View style={styles.orderLeft}>
                    {order.clientPhoto ? (
                      <Image source={{ uri: buildPhotoUrl(order.clientPhoto)! }} style={styles.orderAvatar} />
                    ) : (
                      <View style={[styles.orderAvatar, styles.orderAvatarPlaceholder]}>
                        <MaterialIcons name="person" size={20} color={PRIMARY} />
                      </View>
                    )}
                    <View style={styles.orderNameBlock}>
                      <Text style={styles.orderName}>{order.clientName}</Text>
                      <View style={styles.orderMeta}>
                        <MaterialIcons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.orderMetaText}>{order.rating}</Text>
                        <Text style={styles.orderMetaDot}>•</Text>
                        <Text style={styles.orderMetaText}>{order.locationLabel}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderPrice} numberOfLines={1}>{order.price}</Text>
                  </View>
                </View>
                {/* Product thumbnails */}
                {order.itemImageUrls.length > 0 ? (
                  <View style={styles.itemThumbnailsRow}>
                    {(order.itemImageUrls.length > 3
                      ? order.itemImageUrls.slice(0, 3)
                      : order.itemImageUrls
                    ).map((uri, idx) => (
                      <Image key={`${order.id}-img-${idx}`} source={{ uri }} style={styles.itemThumb} />
                    ))}
                    {order.itemImageUrls.length > 3 ? (
                      <View style={styles.itemThumbMore}>
                        <Text style={styles.itemThumbMoreText}>+{order.itemImageUrls.length - 3}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {/* Patissiere + payment status */}
                <View style={styles.patissierePaymentRow}>
                  <View style={styles.patissierePill}>
                    {order.patissierePhoto ? (
                      <Image source={{ uri: buildPhotoUrl(order.patissierePhoto)! }} style={styles.patissierePillAvatar} />
                    ) : (
                      <View style={[styles.patissierePillAvatar, styles.smallAvatarPlaceholder]}>
                        <MaterialIcons name="store" size={12} color={PRIMARY} />
                      </View>
                    )}
                    <Text style={styles.patissierePillText} numberOfLines={1}>
                      From: <Text style={styles.patissierePillName}>{order.patissiereName}</Text>
                    </Text>
                  </View>
                  <View style={[styles.paymentStatusBadge, order.paymentStatus === "Paid" ? styles.paymentStatusPaid : styles.paymentStatusNotPaid]}>
                    <MaterialIcons
                      name={order.paymentStatus === "Paid" ? "check-circle" : "schedule"}
                      size={14}
                      color={order.paymentStatus === "Paid" ? "#059669" : "#ea580c"}
                    />
                    <Text
                      style={[
                        styles.paymentStatusText,
                        order.paymentStatus === "Paid" ? styles.paymentStatusTextPaid : styles.paymentStatusTextNotPaid,
                      ]}
                    >
                      {order.paymentStatus === "Paid" ? "Paid" : "Not paid yet"}
                    </Text>
                  </View>
                </View>
                {/* Actions: primary button + chevron */}
                <View style={styles.cardActionsRow}>
                  {order.orderStatus === "delivered" ? (
                    <View style={styles.doneBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                      <Text style={styles.doneBadgeText}>Done</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.primaryActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        onConfirmOrder?.(order.id, order.estimationId);
                      }}
                    >
                      <Text style={styles.primaryActionBtnText}>Accept Order</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.viewDetailsBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      onViewOrder?.(order.id);
                    }}
                  >
                    <MaterialIcons name="chevron-right" size={22} color={SLATE_400} />
                  </Pressable>
                </View>
              </Pressable>
            ); })
          )}
          </ScrollView>
        </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Livreur workspace — map (real OSM like register), header, search, controls, bottom sheet.
 */
export default function WorkspaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activeOrderId?: string }>();
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
  const [availableList, setAvailableList] = useState<AvailableEstimationForDelivery[]>([]);
  const [acceptedList, setAcceptedList] = useState<AvailableEstimationForDelivery[]>([]);
  const [estimatedList, setEstimatedList] = useState<AvailableEstimationForDelivery[]>([]);
  const [historicList, setHistoricList] = useState<AvailableEstimationForDelivery[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; photo: string | null; city: string | null; latitude: number | null; longitude: number | null; rating: string }>>({});
  const [productTitles, setProductTitles] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [availableLoading, setAvailableLoading] = useState(true);
  const [acceptedLoading, setAcceptedLoading] = useState(true);
  const [estimatedLoading, setEstimatedLoading] = useState(true);
  const [historicLoading, setHistoricLoading] = useState(true);
  const [selectedOrderIdForMap, setSelectedOrderIdForMap] = useState<string | null>(null);
  const [estimationModalOrderId, setEstimationModalOrderId] = useState<string | null>(null);
  const fullscreenProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const headerTop = insets.top + (Platform.OS === "ios" ? 8 : 12);

  useEffect(() => {
    const activeId = typeof params.activeOrderId === "string" ? params.activeOrderId : params.activeOrderId?.[0];
    if (activeId) setSelectedOrderIdForMap(activeId);
  }, [params.activeOrderId]);

  const loadAvailable = useCallback(async () => {
    try {
      setAvailableLoading(true);
      const data = await getAvailableEstimationsForDeliveryApi();
      setAvailableList(data);

      const userIds = new Set<string>();
      const productIds = new Set<string>();
      data.forEach(({ order }) => {
        userIds.add(order.clientId);
        userIds.add(order.patissiereId);
        order.items.forEach((i) => i.productId && productIds.add(i.productId));
      });

      const [profilesRes, productRes] = await Promise.all([
        Promise.all(
          Array.from(userIds).map(async (userId) => {
            try {
              const res = await getProfileById(userId);
              const u = res?.data?.user;
              const rating = res?.data?.rating?.average != null ? res.data.rating.average.toFixed(1) : "—";
              if (u) {
                return [
                  userId,
                  {
                    name: u.name ?? "—",
                    photo: u.photo ?? null,
                    city: u.city ?? null,
                    latitude: u.latitude ?? null,
                    longitude: u.longitude ?? null,
                    rating,
                  },
                ] as const;
              }
            } catch {
              //
            }
            return [
              userId,
              { name: "—", photo: null, city: null, latitude: null, longitude: null, rating: "—" },
            ] as const;
          })
        ),
        Promise.all(
          Array.from(productIds).map(async (productId) => {
            try {
              const p = await fetchProductByIdApi(productId);
              const title = p?.title ?? productId.slice(-6);
              const img = p?.images?.[0];
              const imageUrl = img ? (buildPhotoUrl(img) ?? undefined) : undefined;
              return [productId, { title, imageUrl }] as const;
            } catch {
              return [productId, { title: productId.slice(-6), imageUrl: undefined }] as const;
            }
          })
        ),
      ]);

      const nextProfiles: typeof profiles = {};
      profilesRes.forEach(([id, pr]) => {
        nextProfiles[id] = pr;
      });
      setProfiles((p) => ({ ...p, ...nextProfiles }));

      const nextTitles: Record<string, string> = {};
      const nextImages: Record<string, string> = {};
      productRes.forEach(([id, { title, imageUrl }]) => {
        nextTitles[id] = title;
        if (imageUrl) nextImages[id] = imageUrl;
      });
      setProductTitles((t) => ({ ...t, ...nextTitles }));
      setProductImages((i) => ({ ...i, ...nextImages }));
    } catch {
      setAvailableList([]);
    } finally {
      setAvailableLoading(false);
    }
  }, []);

  const loadAccepted = useCallback(async () => {
    try {
      setAcceptedLoading(true);
      const data = await getAcceptedEstimationsForDeliveryApi();
      setAcceptedList(data);
      const userIds = new Set<string>();
      const productIds = new Set<string>();
      data.forEach(({ order }) => {
        userIds.add(order.clientId);
        userIds.add(order.patissiereId);
        order.items.forEach((i) => i.productId && productIds.add(i.productId));
      });
      const profilesRes = await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const res = await getProfileById(userId);
            const u = res?.data?.user;
            const rating = res?.data?.rating?.average != null ? res.data.rating.average.toFixed(1) : "—";
            if (u) return [userId, { name: u.name ?? "—", photo: u.photo ?? null, city: u.city ?? null, latitude: u.latitude ?? null, longitude: u.longitude ?? null, rating }] as const;
          } catch {
            // ignore
          }
          return [userId, { name: "—", photo: null, city: null, latitude: null, longitude: null, rating: "—" }] as const;
        })
      );
      const productRes = await Promise.all(
        Array.from(productIds).map(async (productId) => {
          try {
            const p = await fetchProductByIdApi(productId);
            const title = p?.title ?? productId.slice(-6);
            const img = p?.images?.[0];
            const imageUrl = img ? (buildPhotoUrl(img) ?? undefined) : undefined;
            return [productId, { title, imageUrl }] as const;
          } catch {
            return [productId, { title: productId.slice(-6), imageUrl: undefined }] as const;
          }
        })
      );
      const nextProfiles: Record<string, { name: string; photo: string | null; city: string | null; latitude: number | null; longitude: number | null; rating: string }> = {};
      profilesRes.forEach(([id, pr]) => { nextProfiles[id] = pr; });
      setProfiles((p) => ({ ...p, ...nextProfiles }));
      const nextTitles: Record<string, string> = {};
      const nextImages: Record<string, string> = {};
      productRes.forEach(([id, { title, imageUrl }]) => {
        nextTitles[id] = title;
        if (imageUrl) nextImages[id] = imageUrl;
      });
      setProductTitles((t) => ({ ...t, ...nextTitles }));
      setProductImages((i) => ({ ...i, ...nextImages }));
    } catch {
      setAcceptedList([]);
    } finally {
      setAcceptedLoading(false);
    }
  }, []);

  const loadEstimated = useCallback(async () => {
    try {
      setEstimatedLoading(true);
      const data = await getEstimatedEstimationsForDeliveryApi();
      setEstimatedList(data);
      const userIds = new Set<string>();
      const productIds = new Set<string>();
      data.forEach(({ order }) => {
        userIds.add(order.clientId);
        userIds.add(order.patissiereId);
        order.items.forEach((i) => i.productId && productIds.add(i.productId));
      });
      const profilesRes = await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const res = await getProfileById(userId);
            const u = res?.data?.user;
            const rating = res?.data?.rating?.average != null ? res.data.rating.average.toFixed(1) : "—";
            if (u) return [userId, { name: u.name ?? "—", photo: u.photo ?? null, city: u.city ?? null, latitude: u.latitude ?? null, longitude: u.longitude ?? null, rating }] as const;
          } catch {
            // ignore
          }
          return [userId, { name: "—", photo: null, city: null, latitude: null, longitude: null, rating: "—" }] as const;
        })
      );
      const productRes = await Promise.all(
        Array.from(productIds).map(async (productId) => {
          try {
            const p = await fetchProductByIdApi(productId);
            const title = p?.title ?? productId.slice(-6);
            const img = p?.images?.[0];
            const imageUrl = img ? (buildPhotoUrl(img) ?? undefined) : undefined;
            return [productId, { title, imageUrl }] as const;
          } catch {
            return [productId, { title: productId.slice(-6), imageUrl: undefined }] as const;
          }
        })
      );
      const nextProfiles: Record<string, { name: string; photo: string | null; city: string | null; latitude: number | null; longitude: number | null; rating: string }> = {};
      profilesRes.forEach(([id, pr]) => { nextProfiles[id] = pr; });
      setProfiles((p) => ({ ...p, ...nextProfiles }));
      const nextTitles: Record<string, string> = {};
      const nextImages: Record<string, string> = {};
      productRes.forEach(([id, { title, imageUrl }]) => {
        nextTitles[id] = title;
        if (imageUrl) nextImages[id] = imageUrl;
      });
      setProductTitles((t) => ({ ...t, ...nextTitles }));
      setProductImages((i) => ({ ...i, ...nextImages }));
    } catch {
      setEstimatedList([]);
    } finally {
      setEstimatedLoading(false);
    }
  }, []);

  const loadHistoric = useCallback(async () => {
    try {
      setHistoricLoading(true);
      const data = await getDeliveredEstimationsForDeliveryApi();
      setHistoricList(data);
      const userIds = new Set<string>();
      const productIds = new Set<string>();
      data.forEach(({ order }) => {
        userIds.add(order.clientId);
        userIds.add(order.patissiereId);
        order.items.forEach((i) => i.productId && productIds.add(i.productId));
      });
      const profilesRes = await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const res = await getProfileById(userId);
            const u = res?.data?.user;
            const rating = res?.data?.rating?.average != null ? res.data.rating.average.toFixed(1) : "—";
            if (u) return [userId, { name: u.name ?? "—", photo: u.photo ?? null, city: u.city ?? null, latitude: u.latitude ?? null, longitude: u.longitude ?? null, rating }] as const;
          } catch {
            // ignore
          }
          return [userId, { name: "—", photo: null, city: null, latitude: null, longitude: null, rating: "—" }] as const;
        })
      );
      const productRes = await Promise.all(
        Array.from(productIds).map(async (productId) => {
          try {
            const p = await fetchProductByIdApi(productId);
            const title = p?.title ?? productId.slice(-6);
            const img = p?.images?.[0];
            const imageUrl = img ? (buildPhotoUrl(img) ?? undefined) : undefined;
            return [productId, { title, imageUrl }] as const;
          } catch {
            return [productId, { title: productId.slice(-6), imageUrl: undefined }] as const;
          }
        })
      );
      const nextProfiles: Record<string, { name: string; photo: string | null; city: string | null; latitude: number | null; longitude: number | null; rating: string }> = {};
      profilesRes.forEach(([id, pr]) => { nextProfiles[id] = pr; });
      setProfiles((p) => ({ ...p, ...nextProfiles }));
      const nextTitles: Record<string, string> = {};
      const nextImages: Record<string, string> = {};
      productRes.forEach(([id, { title, imageUrl }]) => {
        nextTitles[id] = title;
        if (imageUrl) nextImages[id] = imageUrl;
      });
      setProductTitles((t) => ({ ...t, ...nextTitles }));
      setProductImages((i) => ({ ...i, ...nextImages }));
    } catch {
      setHistoricList([]);
    } finally {
      setHistoricLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailable();
  }, [loadAvailable]);

  useEffect(() => {
    loadAccepted();
  }, [loadAccepted]);

  useEffect(() => {
    loadEstimated();
  }, [loadEstimated]);

  useEffect(() => {
    loadHistoric();
  }, [loadHistoric]);

  useEffect(() => {
    const socket = getOrderSocket();
    const handler = () => {
      loadAvailable();
      loadAccepted();
      loadEstimated();
      loadHistoric();
    };
    socket.on("estimation.created", handler);
    return () => {
      socket.off("estimation.created", handler);
    };
  }, [loadAvailable, loadAccepted, loadEstimated, loadHistoric]);

  const userLat = userLocation?.lat ?? OSM_DEFAULT.lat;
  const userLng = userLocation?.lng ?? OSM_DEFAULT.lng;
  const mapMarkers = useMemo((): MapMarker[] => {
    if (!selectedOrderIdForMap) return [];
    const entry =
      availableList.find(({ order }) => order.id === selectedOrderIdForMap) ??
      acceptedList.find(({ order }) => order.id === selectedOrderIdForMap) ??
      estimatedList.find(({ order }) => order.id === selectedOrderIdForMap) ??
      historicList.find(({ order }) => order.id === selectedOrderIdForMap);
    if (!entry) return [];
    const { order } = entry;
    const out: MapMarker[] = [];
    if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
      out.push({
        lat: order.deliveryLatitude,
        lng: order.deliveryLongitude,
        label: "Delivery",
      });
    }
    const pat = profiles[order.patissiereId];
    if (pat?.latitude != null && pat?.longitude != null) {
      out.push({
        lat: pat.latitude,
        lng: pat.longitude,
        label: "Pickup",
      });
    }
    return out;
  }, [availableList, acceptedList, estimatedList, historicList, profiles, selectedOrderIdForMap]);

  const handleCardPressForMap = useCallback((orderId: string) => {
    setSelectedOrderIdForMap((prev) => (prev === orderId ? null : orderId));
  }, []);

  const handleConfirmOrder = useCallback(
    async (orderId: string, estimationId?: string) => {
      if (estimationId) {
        try {
          await confirmEstimationApi(estimationId);
          await Promise.all([loadAvailable(), loadAccepted(), loadEstimated(), loadHistoric()]);
        } catch {
          // show error optionally
        }
      } else {
        router.push(`/(main)/delivery-order/${orderId}` as any);
      }
    },
    [router, loadAvailable, loadAccepted, loadEstimated, loadHistoric]
  );

  const buildOrderItem = useCallback(
    (
      { estimation, order }: AvailableEstimationForDelivery,
      options: { estimationId?: string }
    ): WorkspaceOrderItem => {
      const client = profiles[order.clientId];
      const patissiere = profiles[order.patissiereId];
      const dist =
        userLocation && order.deliveryLatitude != null && order.deliveryLongitude != null
          ? distanceKm(
              userLocation.lat,
              userLocation.lng,
              order.deliveryLatitude,
              order.deliveryLongitude
            ).toFixed(1) + " km away"
          : "—";
      const locationLabel = client?.city?.trim() ? client.city : "—";
      const itemsStr =
        order.items
          .map((i) => `${i.quantity}x ${productTitles[i.productId] ?? i.productId?.slice(-6) ?? "Item"}`)
          .join(", ") || "—";
      const itemImageUrls = order.items.map(
        (i) => productImages[i.productId] ?? FALLBACK_ITEM_IMAGE
      );
      const paymentStatus: "Paid" | "Not paid yet" =
        estimation.paidAt ? "Paid" : "Not paid yet";
      return {
        id: order.id,
        estimationId: options.estimationId ?? estimation.id,
        clientName: client?.name ?? "Client",
        clientPhoto: client?.photo ?? null,
        rating: client?.rating ?? "—",
        locationLabel,
        tag: client?.city ?? "",
        patissiereName: patissiere?.name ?? "Patissiere",
        patissierePhoto: patissiere?.photo ?? null,
        deliveryName: user?.name ?? "Delivery",
        deliveryPhoto: user?.photo ?? null,
        price: "€" + estimation.price.toFixed(2),
        distance: dist,
        items: itemsStr,
        itemImageUrls,
        highlighted: false,
        paymentStatus,
        orderStatus: order.status,
      };
    },
    [profiles, userLocation, productTitles, productImages, user]
  );

  const availableOrders: WorkspaceOrderItem[] = useMemo(
    () => availableList.map((entry) => buildOrderItem(entry, {})),
    [availableList, buildOrderItem]
  );

  const acceptedOrders: WorkspaceOrderItem[] = useMemo(
    () => acceptedList.map((entry) => buildOrderItem(entry, { estimationId: entry.estimation.id })),
    [acceptedList, buildOrderItem]
  );

  const estimatedOrders: WorkspaceOrderItem[] = useMemo(
    () => estimatedList.map((entry) => buildOrderItem(entry, { estimationId: entry.estimation.id })),
    [estimatedList, buildOrderItem]
  );

  const historicOrders: WorkspaceOrderItem[] = useMemo(
    () => historicList.map((entry) => buildOrderItem(entry, { estimationId: entry.estimation.id })),
    [historicList, buildOrderItem]
  );

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
    return <Redirect href={"/(main)" as import("expo-router").Href} />;
  }

  const mapHtml = buildWorkspaceMapHtml(userLat, userLng, mapMarkers);
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
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Driver Workspace</Text>
          <View style={styles.avatarWrap}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={28} color={PRIMARY} />
              </View>
            )}
          </View>
        </View>

        <View style={[styles.searchWrap, { top: headerTop + 56 }]}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={PRIMARY} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search delivery location"
              placeholderTextColor={SLATE_400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <MaterialIcons name="mic" size={20} color={SLATE_400} />
          </View>
        </View>

        <View style={styles.controlsWrap}>
          <View style={styles.zoomCard}>
            <Pressable style={styles.zoomBtn}>
              <MaterialIcons name="add" size={22} color={SLATE_600} />
            </Pressable>
            <Pressable style={[styles.zoomBtn, styles.zoomBtnLast]}>
              <MaterialIcons name="remove" size={22} color={SLATE_600} />
            </Pressable>
          </View>
          <Pressable style={styles.nearMeBtn}>
            <MaterialIcons name="near-me" size={24} color={PRIMARY} />
          </Pressable>
          <Pressable style={styles.fullscreenBtn} onPress={enterFullscreen}>
            <MaterialIcons name="fullscreen" size={22} color="#fff" />
          </Pressable>
        </View>

        <Pressable style={[styles.backBtn, { top: headerTop + 4 }]} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>

        <BottomOrdersSheet
          headerTop={headerTop}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          orders={
            activeTab === "Available"
              ? availableOrders
              : activeTab === "Accepted"
                ? acceptedOrders
                : activeTab === "Estimated"
                  ? estimatedOrders
                  : historicOrders
          }
          selectedOrderIdForMap={selectedOrderIdForMap}
          onCardPressForMap={handleCardPressForMap}
          onViewOrder={(id) => router.push(`/(main)/delivery-order/${id}` as any)}
          onConfirmOrder={handleConfirmOrder}
          onOpenEstimationModal={(id) => setEstimationModalOrderId(id)}
          loading={
            (activeTab === "Available" && availableLoading) ||
            (activeTab === "Accepted" && acceptedLoading) ||
            (activeTab === "Estimated" && estimatedLoading) ||
            (activeTab === "Historic" && historicLoading)
          }
          floatingAddButtonVisible={!!(selectedOrderIdForMap && activeTab === "Available")}
          onFloatingAddPress={() => selectedOrderIdForMap && setEstimationModalOrderId(selectedOrderIdForMap)}
        />

        <EstimationCreateModal
          visible={!!estimationModalOrderId}
          orderId={estimationModalOrderId ?? ""}
          role="delivery"
          onClose={() => setEstimationModalOrderId(null)}
          onSuccess={() => {
            setEstimationModalOrderId(null);
            loadAvailable();
            loadEstimated();
            loadAccepted();
          }}
        />

      </Animated.View>

      {/* Fullscreen overlay: fades in when entering fullscreen; must not receive touches when closed */}
      <Animated.View
        style={[styles.fullscreenOverlay, { paddingTop: headerTop }, overlayAnimatedStyle]}
        pointerEvents={isFullScreen ? "box-none" : "none"}
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
    // backgroundColor: "red",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    // backgroundColor: "rgba(248,246,247,0.9)",
    // borderBottomWidth: 1,
    // borderBottomColor: "rgba(218,27,97,0.1)",
    zIndex: 20,
  },
  headerSpacer: { width: 40 },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: PRIMARY,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 18 },
  avatarPlaceholder: {
    backgroundColor: PRIMARY_05,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 25,
    fontWeight: "900",
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  searchWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 30,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  controlsWrap: {
    position: "absolute",
    right: 16,
    top: 178,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    zIndex: 20,
  },
  zoomCard: {
    backgroundColor: SURFACE,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.05)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  zoomBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnLast: {
    borderBottomWidth: 0,
  },
  nearMeBtn: {
    width: 48,
    height: 48,
    borderRadius: 100,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.05)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  fullscreenBtn: {
    width: 48,
    height: 48,
    borderRadius: 100,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
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
    backgroundColor: BACKGROUND_LIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0,
    paddingTop: 12,
    paddingBottom: 24,
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 16,
    overflow: "visible",
  },
  bottomSheetInner: {
    flex: 1,
    overflow: "hidden",
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: SLATE_200,
    alignSelf: "center",
    marginBottom: 12,
  },
  ordersScrollWrap: {
    flex: 1,
    position: "relative",
  },
  floatingAddBtn: {
    position: "absolute",
    left: 16,
    top: -56,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D81B60",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  tabsScroll: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(218,27,97,0.05)",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    alignItems: "stretch",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 12, fontWeight: "600", color: SLATE_400 },
  tabTextActive: { fontWeight: "700", color: PRIMARY },
  ordersScroll: { flex: 1 },
  ordersScrollContent: { padding: 16, gap: 12 },
  ordersLoading: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  ordersLoadingText: { fontSize: 13, color: SLATE_500, fontWeight: "600" },
  orderCard: {
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    marginBottom: 16,
    opacity: 0.9,
  },
  orderCardHighlight: {
    borderRadius: 12,
    backgroundColor: "rgba(218,27,97,0.05)",
    borderWidth: 2,
    borderColor: "#D81B60",
    opacity: 1,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  orderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  orderAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  orderNameBlock: { flex: 1, minWidth: 0 },
  orderName: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  orderMetaText: { fontSize: 12, color: SLATE_500, fontWeight: "600" },
  orderMetaDot: { fontSize: 12, color: SLATE_400, marginHorizontal: 2 },
  orderRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  orderPrice: { fontSize: 20, fontWeight: "800", color: PRIMARY },
  itemThumbnailsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  itemThumbMore: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(218,27,97,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemThumbMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  patissierePaymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patissierePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    maxWidth: "70%",
  },
  patissierePillAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  patissierePillText: { fontSize: 12, color: SLATE_600 },
  patissierePillName: { fontWeight: "700" },
  smallAvatarPlaceholder: {
    backgroundColor: PRIMARY_05,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  paymentStatusPaid: { backgroundColor: "rgba(16,185,129,0.12)" },
  paymentStatusNotPaid: { backgroundColor: "rgba(234,88,12,0.12)" },
  paymentStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  paymentStatusTextPaid: { color: "#059669" },
  paymentStatusTextNotPaid: { color: "#ea580c" },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  viewDetailsBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#059669",
  },
  doneBadgeText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
  },
});
