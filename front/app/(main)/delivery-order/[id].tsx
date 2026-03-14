import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import {
  PRIMARY,
  PRIMARY_05,
  SURFACE,
  TEXT_PRIMARY,
  SLATE_500,
  SLATE_600,
  BORDER,
  BACKGROUND_LIGHT,
} from "@/constants/colors";
import {
  getClientOrderByIdApi,
  type ClientOrder,
  type ClientOrderItem,
} from "@/store/features/order/orderApi";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";
import { buildPhotoUrl } from "@/lib/utils";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop";

type ProductPreview = { title: string; imageUri?: string; description?: string };

function resolveImage(raw?: string): string | undefined {
  if (!raw) return undefined;
  return buildPhotoUrl(raw) ?? undefined;
}

export default function DeliveryOrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [productById, setProductById] = useState<Record<string, ProductPreview>>({});

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError("Order ID missing");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const found = await getClientOrderByIdApi(id);
      if (!found) {
        setError("Order not found");
        setOrder(null);
        return;
      }
      setOrder(found);
      const uniqueProductIds = Array.from(
        new Set(found.items.map((it) => it.productId).filter(Boolean))
      );
      const previews: Record<string, ProductPreview> = {};
      await Promise.allSettled(
        uniqueProductIds.map(async (productId) => {
          const product = await fetchProductByIdApi(productId);
          previews[productId] = {
            title: product.title || `Product ${productId.slice(-6)}`,
            imageUri: resolveImage(product.images?.[0]),
            description: product.description || "",
          };
        })
      );
      setProductById(previews);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading delivery request...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <MaterialIcons name="error-outline" size={32} color="#b91c1c" />
        <Text style={styles.errorText}>{error ?? "Order not found"}</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const totalEarnings = order.totalPrice > 0 ? order.totalPrice : order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const mapPreviewWidth = width - 32;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.topBarIcon} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.topBarTitle}>New Delivery Request</Text>
        <Pressable style={styles.topBarIcon}>
          <MaterialIcons name="more-vert" size={24} color={PRIMARY} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Map preview */}
        <View style={[styles.mapPreview, { width: mapPreviewWidth }]}>
          <View style={styles.mapPlaceholder} />
          <View style={styles.mapGradient} />
          <View style={styles.mapBadge}>
            <MaterialIcons name="distance" size={14} color={PRIMARY} />
            <Text style={styles.mapBadgeText}>2.4 miles (12 min)</Text>
          </View>
        </View>

        {/* Client card */}
        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar} />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>Client</Text>
              <View style={styles.clientMeta}>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified Customer</Text>
                </View>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
            </View>
            <Pressable style={styles.chatBtn}>
              <MaterialIcons name="chat" size={22} color={PRIMARY} />
            </Pressable>
          </View>
        </View>

        {/* Order summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.itemsList}>
          {order.items.map((item, idx) => (
            <DeliveryOrderItemRow
              key={`${item.id}-${idx}`}
              item={item}
              product={productById[item.productId]}
              fallbackTitle={`Product ${item.productId.slice(-6)}`}
            />
          ))}
        </View>
      </ScrollView>

      {/* Fixed bottom bar – Potential Earnings + Estimation only */}
      <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.earningsRow}>
          <Text style={styles.earningsLabel}>Potential Earnings</Text>
          <Text style={styles.earningsValue}>${totalEarnings.toFixed(2)}</Text>
        </View>
        <Pressable
          style={styles.estimateBtn}
          onPress={() => {
            // TODO: open estimation flow
          }}
        >
          <MaterialIcons name="schedule" size={22} color="#fff" />
          <Text style={styles.estimateBtnText}>Estimation</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DeliveryOrderItemRow({
  item,
  product,
  fallbackTitle,
}: {
  item: ClientOrderItem;
  product?: ProductPreview;
  fallbackTitle: string;
}) {
  const imageUri = product?.imageUri ?? FALLBACK_IMAGE;
  const title = product?.title || fallbackTitle;
  const notes = [
    item.customizationDetails?.colors,
    item.customizationDetails?.garniture,
    item.customizationDetails?.message,
  ]
    .filter(Boolean)
    .join(" • ") || undefined;

  return (
    <View style={styles.itemRow}>
      <ExpoImage source={{ uri: imageUri }} style={styles.itemImage} contentFit="cover" />
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {title}
        </Text>
        {notes ? (
          <Text style={styles.itemNotes} numberOfLines={1}>
            {notes}
          </Text>
        ) : null}
      </View>
      <Text style={styles.itemQty}>x{item.quantity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: SLATE_500, fontWeight: "600" },
  errorText: { fontSize: 14, color: "#b91c1c", fontWeight: "600", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(248,246,247,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: `${PRIMARY}18`,
  },
  topBarIcon: {
    width: 48,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  mapPreview: {
    alignSelf: "center",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${PRIMARY}18`,
    marginBottom: 12,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#e2e8f0",
  },
  mapGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    // gradient simulated via overlay – use LinearGradient if available
  },
  mapBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBadgeText: { fontSize: 12, fontWeight: "700", color: TEXT_PRIMARY },
  clientCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_05,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  clientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${PRIMARY}20`,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY },
  clientMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  verifiedBadge: {
    backgroundColor: PRIMARY_05,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedText: { fontSize: 12, fontWeight: "600", color: PRIMARY },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#f59e0b" },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BACKGROUND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  itemsList: { gap: 12 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: SURFACE,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_05,
  },
  itemImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: BORDER },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: TEXT_PRIMARY },
  itemNotes: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  itemQty: { fontSize: 16, fontWeight: "700", color: PRIMARY },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${PRIMARY}18`,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  earningsLabel: { fontSize: 14, color: SLATE_500, fontWeight: "500" },
  earningsValue: { fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY },
  estimateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  estimateBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
