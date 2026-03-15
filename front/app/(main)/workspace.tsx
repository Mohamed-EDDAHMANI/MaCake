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
  confirmEstimationApi,
  type AvailableEstimationForDelivery,
} from "@/store/features/estimation";
import { getProfileById } from "@/store/features/auth/authApi";
import { getOrderSocket } from "@/lib/order-socket";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type TabKey = "Available" | "Accepted" | "Estimated";

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
  loading,
}: {
  headerTop: number;
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  orders: WorkspaceOrderItem[];
  selectedOrderIdForMap: string | null;
  onCardPressForMap?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
  onConfirmOrder?: (orderId: string, estimationId?: string) => void;
  loading?: boolean;
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
          {loading ? (
            <View style={styles.ordersLoading}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={styles.ordersLoadingText}>Loading available requests...</Text>
            </View>
          ) : (
            orders.map((order) => (
              <Pressable
                key={order.id}
                style={[
                  styles.orderCard,
                  order.highlighted && styles.orderCardHighlight,
                  selectedOrderIdForMap === order.id && styles.orderCardHighlight,
                ]}
                onPress={() => onCardPressForMap?.(order.id)}
              >
                <View style={styles.orderRow}>
                  <View style={styles.orderLeft}>
                    {order.clientPhoto ? (
                      <Image source={{ uri: buildPhotoUrl(order.clientPhoto)! }} style={styles.orderAvatar} />
                    ) : (
                      <View style={[styles.orderAvatar, styles.orderAvatarPlaceholder]}>
                        <MaterialIcons name="person" size={20} color={PRIMARY} />
                      </View>
                    )}
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
                {order.itemImageUrls.length > 0 ? (
                  <View style={styles.itemThumbnailsRow}>
                    {order.itemImageUrls.slice(0, 4).map((uri, idx) => (
                      <Image key={`${order.id}-img-${idx}`} source={{ uri }} style={styles.itemThumb} />
                    ))}
                  </View>
                ) : null}
                <View style={styles.patissiereDeliveryRow}>
                  {order.patissierePhoto ? (
                    <Image source={{ uri: buildPhotoUrl(order.patissierePhoto)! }} style={styles.smallAvatar} />
                  ) : (
                    <View style={[styles.smallAvatar, styles.smallAvatarPlaceholder]}>
                      <MaterialIcons name="store" size={14} color={PRIMARY} />
                    </View>
                  )}
                  <Text style={styles.patissiereFrom} numberOfLines={1}>
                    From: {order.patissiereName}
                  </Text>
                  <View style={styles.deliveryChip}>
                    {order.deliveryPhoto ? (
                      <Image source={{ uri: buildPhotoUrl(order.deliveryPhoto)! }} style={styles.smallAvatar} />
                    ) : (
                      <View style={[styles.smallAvatar, styles.smallAvatarPlaceholder]}>
                        <MaterialIcons name="local-shipping" size={14} color={PRIMARY} />
                      </View>
                    )}
                    <Text style={styles.deliveryChipText} numberOfLines={1}>
                      {order.deliveryName}
                    </Text>
                  </View>
                </View>
                <View style={[styles.paymentStatusRow, order.paymentStatus === "Paid" ? styles.paymentStatusPaid : styles.paymentStatusNotPaid]}>
                  <MaterialIcons
                    name={order.paymentStatus === "Paid" ? "check-circle" : "schedule"}
                    size={14}
                    color={order.paymentStatus === "Paid" ? "#15803d" : "#b45309"}
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
                <View style={styles.cardActionsRow}>
                  <Pressable
                    style={styles.viewDetailsBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      onViewOrder?.(order.id);
                    }}
                  >
                    <Text style={styles.viewDetailsBtnText}>View order</Text>
                    <MaterialIcons name="chevron-right" size={18} color={PRIMARY} />
                  </Pressable>
                  {order.orderStatus === "delivered" ? (
                    <View style={styles.doneBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#15803d" />
                      <Text style={styles.doneBadgeText}>Done</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.doneActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        onConfirmOrder?.(order.id, order.estimationId);
                      }}
                    >
                      <MaterialIcons name="check-circle" size={16} color="#15803d" />
                      <Text style={styles.doneActionBtnText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))
          )}
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
  const [profiles, setProfiles] = useState<Record<string, { name: string; photo: string | null; city: string | null; latitude: number | null; longitude: number | null; rating: string }>>({});
  const [productTitles, setProductTitles] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [availableLoading, setAvailableLoading] = useState(true);
  const [acceptedLoading, setAcceptedLoading] = useState(true);
  const [estimatedLoading, setEstimatedLoading] = useState(true);
  const [selectedOrderIdForMap, setSelectedOrderIdForMap] = useState<string | null>(null);
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
    const socket = getOrderSocket();
    const handler = () => {
      loadAvailable();
      loadAccepted();
      loadEstimated();
    };
    socket.on("estimation.created", handler);
    return () => {
      socket.off("estimation.created", handler);
    };
  }, [loadAvailable, loadAccepted, loadEstimated]);

  const userLat = userLocation?.lat ?? OSM_DEFAULT.lat;
  const userLng = userLocation?.lng ?? OSM_DEFAULT.lng;
  const mapMarkers = useMemo((): MapMarker[] => {
    if (!selectedOrderIdForMap) return [];
    const entry =
      availableList.find(({ order }) => order.id === selectedOrderIdForMap) ??
      acceptedList.find(({ order }) => order.id === selectedOrderIdForMap) ??
      estimatedList.find(({ order }) => order.id === selectedOrderIdForMap);
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
  }, [availableList, acceptedList, estimatedList, profiles, selectedOrderIdForMap]);

  const handleCardPressForMap = useCallback((orderId: string) => {
    setSelectedOrderIdForMap((prev) => (prev === orderId ? null : orderId));
  }, []);

  const handleConfirmOrder = useCallback(
    async (orderId: string, estimationId?: string) => {
      if (estimationId) {
        try {
          await confirmEstimationApi(estimationId);
          await Promise.all([loadAvailable(), loadAccepted(), loadEstimated()]);
        } catch {
          // show error optionally
        }
      } else {
        router.push(`/(main)/delivery-order/${orderId}` as any);
      }
    },
    [router, loadAvailable, loadAccepted, loadEstimated]
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
          <View style={styles.iconBtnSpacer} />
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
          orders={
            activeTab === "Available"
              ? availableOrders
              : activeTab === "Accepted"
                ? acceptedOrders
                : estimatedOrders
          }
          selectedOrderIdForMap={selectedOrderIdForMap}
          onCardPressForMap={handleCardPressForMap}
          onViewOrder={(id) => router.push(`/(main)/delivery-order/${id}` as any)}
          onConfirmOrder={handleConfirmOrder}
          loading={
            (activeTab === "Available" && availableLoading) ||
            (activeTab === "Accepted" && acceptedLoading) ||
            (activeTab === "Estimated" && estimatedLoading)
          }
        />

        <Pressable style={[styles.backBtn, { top: headerTop + 4 }]} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
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

      {/* Dedicated fullscreen expand button on top so first tap always works */}
      {!isFullScreen && (
        <Pressable
          style={[styles.fullscreenExpandTouchTarget, { top: headerTop + 4 }]}
          onPress={enterFullscreen}
        >
          <MaterialIcons name="fullscreen" size={22} color={PRIMARY} />
        </Pressable>
      )}
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
    paddingBottom: 10,
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
  iconBtnSpacer: { width: 48, height: 48 },
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
  fullscreenExpandTouchTarget: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 35,
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
  orderAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  orderName: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  orderMetaText: { fontSize: 11, color: PRIMARY, fontWeight: "500" },
  patissiereFrom: { fontSize: 10, color: SLATE_500, marginTop: 2 },
  orderRight: { alignItems: "flex-end" },
  orderPrice: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  orderDistance: { fontSize: 10, color: SLATE_500, marginTop: 2 },
  itemThumbnailsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: BORDER_SUBTLE,
  },
  patissiereDeliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  smallAvatarPlaceholder: {
    backgroundColor: PRIMARY_05,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  deliveryChipText: { fontSize: 11, fontWeight: "700", color: SLATE_600, maxWidth: 80 },
  paymentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  paymentStatusPaid: { backgroundColor: "#dcfce7" },
  paymentStatusNotPaid: { backgroundColor: "#fffbeb" },
  paymentStatusText: { fontSize: 11, fontWeight: "700" },
  paymentStatusTextPaid: { color: "#15803d" },
  paymentStatusTextNotPaid: { color: "#b45309" },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(218,27,97,0.3)",
    backgroundColor: "rgba(218,27,97,0.06)",
  },
  viewDetailsBtnText: { fontSize: 13, fontWeight: "600", color: PRIMARY },
  confirmOrderCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#16a34a",
  },
  confirmOrderCardBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  doneActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  doneActionBtnText: { fontSize: 12, fontWeight: "700", color: "#15803d" },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  doneBadgeText: { fontSize: 12, fontWeight: "700", color: "#15803d" },
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
