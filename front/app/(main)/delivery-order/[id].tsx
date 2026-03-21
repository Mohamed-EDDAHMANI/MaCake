import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { EstimationCreateModal } from "@/components/order/EstimationCreateModal";
import { Image } from "expo-image";
import {
  PRIMARY,
  PRIMARY_05,
  SURFACE,
  TEXT_PRIMARY,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  BORDER_SUBTLE,
  BACKGROUND_LIGHT,
} from "@/constants/colors";
import { useAppSelector } from "@/store/hooks";
import { getClientOrderByIdApi, type ClientOrder, type ClientOrderItem } from "@/store/features/order/orderApi";
import { getProfileById } from "@/store/features/auth/authApi";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";
import { getEstimationsByOrderIdApi, confirmEstimationApi } from "@/store/features/estimation";
import { buildPhotoUrl } from "@/lib/utils";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop";

function formatDeliveryWindow(value: string): string {
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return "Today, --:-- - --:--";
  const end = new Date(base.getTime() + 30 * 60 * 1000);
  const dayPart = base.toDateString() === new Date().toDateString() ? "Today" : base.toLocaleDateString("en-GB");
  const from = base.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  const to = end.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  return `${dayPart}, ${from} - ${to}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  completed: "Completed",
  delivering: "Out for Delivery",
  delivered: "Delivered",
  refused: "Refused",
};

const STATUS_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  delivering: { bg: "#e0e7ff", text: "#4338ca" },
  delivered: { bg: "#dcfce7", text: "#15803d" },
};
const DEFAULT_BADGE = { bg: "#e0e7ff", text: "#4338ca" };

export default function DeliveryOrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : params?.id?.[0];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [clientProfile, setClientProfile] = useState<{ name: string; photo: string | null; rating: string } | null>(null);
  const [patissiereProfile, setPatissiereProfile] = useState<{ name: string; photo: string | null; address: string | null } | null>(null);
  const [productTitles, setProductTitles] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [showEstimationModal, setShowEstimationModal] = useState(false);
  const [myDeliveryEstimationId, setMyDeliveryEstimationId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const userId = useAppSelector((state) => state.auth.user?.id ?? "");
  const currentUser = useAppSelector((state) => state.auth.user);

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
        setClientProfile(null);
        setPatissiereProfile(null);
        return;
      }
      setOrder(found);

      const [clientRes, patRes] = await Promise.all([
        getProfileById(found.clientId),
        getProfileById(found.patissiereId),
      ]);
      if (clientRes?.data?.user) {
        const u = clientRes.data.user;
        const rating = clientRes.data?.rating?.average != null ? clientRes.data.rating.average.toFixed(1) : "—";
        setClientProfile({
          name: u.name ?? "Client",
          photo: u.photo ?? null,
          rating,
        });
      } else {
        setClientProfile({ name: "Client", photo: null, rating: "—" });
      }
      if (patRes?.data?.user) {
        const u = patRes.data.user as { address?: string | null; city?: string | null; latitude?: number | null; longitude?: number | null };
        const addr =
          found.patissiereAddress ??
          u.address ??
          (u.city ? `${u.city}${u.latitude != null && u.longitude != null ? " (location set)" : ""}` : null) ??
          (u.latitude != null && u.longitude != null ? "Location set" : null);
        setPatissiereProfile({
          name: (patRes.data.user as { name?: string }).name ?? "Patissiere",
          photo: (patRes.data.user as { photo?: string | null }).photo ?? null,
          address: addr,
        });
      } else {
        setPatissiereProfile({ name: "Patissiere", photo: null, address: found.patissiereAddress ?? null });
      }

      const productIds = Array.from(new Set(found.items.map((i) => i.productId).filter(Boolean)));
      const titles: Record<string, string> = {};
      const images: Record<string, string> = {};
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const p = await fetchProductByIdApi(productId);
            titles[productId] = p?.title ?? productId.slice(-6);
            const firstImg = p?.images?.[0];
            images[productId] = firstImg ? (buildPhotoUrl(firstImg) ?? FALLBACK_IMAGE) : FALLBACK_IMAGE;
          } catch {
            titles[productId] = productId.slice(-6);
          }
        })
      );
      setProductTitles(titles);
      setProductImages((prev) => ({ ...prev, ...images }));

      const estimations = await getEstimationsByOrderIdApi(found.id);
      const myDelivery = estimations.find(
        (e) => e.userRole === "delivery" && e.createdBy === userId
      );
      setMyDeliveryEstimationId(myDelivery?.id ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load order");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={32} color="#b91c1c" />
          <Text style={styles.errorText}>{error ?? "Order not found"}</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const orderCode = `MC-${order.id.slice(-4).toUpperCase()}`;
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusBadgeStyle = STATUS_BADGE_STYLE[order.status] ?? DEFAULT_BADGE;
  const isDelivered = order.status === "delivered";
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const potentialEarnings = order.totalPrice > 0 ? order.totalPrice : subtotal;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={20} color={TEXT_PRIMARY} />
            </Pressable>
            <View>
              <Text style={styles.headerSub}>Order Details</Text>
              <Text style={styles.headerCode}>#{orderCode}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadgeStyle.text }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.deliveryCard}>
          <View style={styles.deliveryIcon}>
            <MaterialIcons name="delivery-dining" size={28} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deliveryMeta}>Delivery window</Text>
            <Text style={styles.deliveryRange}>{formatDeliveryWindow(order.requestedDateTime)}</Text>
            {(order.deliveryLatitude != null && order.deliveryLongitude != null) && (
              <View style={styles.deliveryExtra}>
                <View style={styles.deliveryChip}>
                  <MaterialIcons name="place" size={14} color={PRIMARY} />
                  <Text style={styles.deliveryChipText}>Delivery location set</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <View style={styles.addressCard}>
            <MaterialIcons name="location-on" size={20} color={PRIMARY} />
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.clientCard}>
            {clientProfile?.photo ? (
              <Image
                source={{ uri: buildPhotoUrl(clientProfile.photo)! }}
                style={styles.clientAvatar}
              />
            ) : (
              <View style={[styles.clientAvatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={28} color={PRIMARY} />
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{clientProfile?.name ?? "Client"}</Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingText}>{clientProfile?.rating ?? "—"}</Text>
              </View>
            </View>
            <Pressable style={styles.chatBtn}>
              <MaterialIcons name="chat" size={22} color={PRIMARY} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patissiere (pickup)</Text>
          <View style={styles.clientCard}>
            {patissiereProfile?.photo ? (
              <Image
                source={{ uri: buildPhotoUrl(patissiereProfile.photo)! }}
                style={styles.clientAvatar}
              />
            ) : (
              <View style={[styles.clientAvatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="store" size={28} color={PRIMARY} />
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{patissiereProfile?.name ?? "Patissiere"}</Text>
              {patissiereProfile?.address ? (
                <Text style={styles.patissiereAddress} numberOfLines={2}>{patissiereProfile.address}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery (you)</Text>
          <View style={styles.clientCard}>
            {currentUser?.photo ? (
              <Image
                source={{ uri: buildPhotoUrl(currentUser.photo)! }}
                style={styles.clientAvatar}
              />
            ) : (
              <View style={[styles.clientAvatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="local-shipping" size={28} color={PRIMARY} />
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{currentUser?.name ?? "Delivery"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Order summary</Text>
            <Text style={styles.itemsCount}>{order.items.length} items</Text>
          </View>
          <View style={styles.itemsList}>
            {order.items.map((item, idx) => (
              <OrderItemRow
                key={item.id ?? `${item.productId}-${idx}`}
                item={item}
                title={productTitles[item.productId] ?? item.productId?.slice(-6) ?? "Item"}
                imageUri={productImages[item.productId] ?? FALLBACK_IMAGE}
              />
            ))}
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>{subtotal.toFixed(2)} MAD</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, styles.priceStrong]}>Potential earnings</Text>
            <Text style={[styles.priceValue, styles.priceStrong, styles.pricePrimary]}>
              {potentialEarnings.toFixed(2)} MAD
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {isDelivered ? (
            <View style={styles.doneState}>
              <MaterialIcons name="check-circle" size={24} color="#15803d" />
              <Text style={styles.doneStateText}>Order delivered successfully</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.primaryAction}
                onPress={() => setShowEstimationModal(true)}
              >
                <MaterialIcons name="schedule" size={18} color="#fff" />
                <Text style={styles.primaryActionText}>Add estimation</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryAction, styles.confirmOrderBtn, (!myDeliveryEstimationId || confirming) && styles.confirmOrderBtnDisabled]}
                onPress={async () => {
                  if (!myDeliveryEstimationId || confirming) return;
                  setConfirming(true);
                  try {
                    await confirmEstimationApi(myDeliveryEstimationId);
                    loadOrder();
                  } finally {
                    setConfirming(false);
                  }
                }}
                disabled={!myDeliveryEstimationId || confirming}
              >
                <MaterialIcons name="check-circle" size={18} color="#fff" />
                <Text style={styles.primaryActionText}>{confirming ? "Confirming…" : "Confirm delivery"}</Text>
              </Pressable>
            </>
          )}
          <Pressable style={styles.secondaryAction}>
            <MaterialIcons name="chat-bubble-outline" size={18} color={SLATE_600} />
            <Text style={styles.secondaryActionText}>Contact client</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryAction}
            onPress={() => router.replace({ pathname: "/(main)/workspace", params: { activeOrderId: order.id } } as any)}
          >
            <MaterialIcons name="navigation" size={18} color={SLATE_600} />
            <Text style={styles.secondaryActionText}>Open in map</Text>
          </Pressable>
        </View>
      </ScrollView>

      <EstimationCreateModal
        visible={showEstimationModal}
        orderId={order.id}
        role="delivery"
        onClose={() => setShowEstimationModal(false)}
        onSuccess={() => {
          setShowEstimationModal(false);
          loadOrder();
        }}
      />
    </SafeAreaView>
  );
}

function OrderItemRow({ item, title, imageUri }: { item: ClientOrderItem; title: string; imageUri: string }) {
  const notes = [
    item.customizationDetails?.colors,
    item.customizationDetails?.garniture,
    item.customizationDetails?.message,
  ]
    .filter(Boolean)
    .join(" • ") || null;
  const total = item.price * item.quantity;
  return (
    <View style={styles.itemCard}>
      <Image source={{ uri: imageUri }} style={styles.itemImage} contentFit="cover" />
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
        {notes ? <Text style={styles.itemNotes} numberOfLines={1}>{notes}</Text> : null}
        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
      </View>
      <Text style={styles.itemPrice}>{total.toFixed(2)} MAD</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  headerSub: { fontSize: 12, color: SLATE_500, fontWeight: "600" },
  headerCode: { fontSize: 20, color: TEXT_PRIMARY, fontWeight: "900" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  deliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    padding: 14,
    marginBottom: 20,
  },
  deliveryIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: PRIMARY_05,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryMeta: { fontSize: 10, color: SLATE_500, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  deliveryRange: { marginTop: 2, fontSize: 14, color: TEXT_PRIMARY, fontWeight: "800" },
  deliveryExtra: { flexDirection: "row", gap: 8, marginTop: 6 },
  deliveryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY_05,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deliveryChipText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: TEXT_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  itemsCount: { fontSize: 11, color: SLATE_500, fontWeight: "600" },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
  },
  addressText: { flex: 1, fontSize: 14, color: TEXT_PRIMARY, fontWeight: "600" },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
  },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#f1f5f9" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#f59e0b" },
  patissiereAddress: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BACKGROUND_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemsList: { gap: 10 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
  },
  itemImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#e2e8f0" },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  itemNotes: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  itemQty: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: "800", color: PRIMARY },
  totalCard: {
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    paddingTop: 14,
    marginTop: 4,
    gap: 8,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, color: SLATE_500, fontWeight: "500" },
  priceValue: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: "600" },
  totalDivider: { borderTopWidth: 1, borderTopColor: "#e2e8f0", borderStyle: "dashed", marginTop: 4, paddingTop: 8 },
  priceStrong: { fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY },
  pricePrimary: { color: PRIMARY },
  actions: { marginTop: 22, gap: 10 },
  primaryAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  confirmOrderBtn: { backgroundColor: "#16a34a" },
  confirmOrderBtnDisabled: { opacity: 0.6 },
  secondaryAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryActionText: { color: SLATE_600, fontSize: 14, fontWeight: "800" },
  doneState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  doneStateText: { fontSize: 15, fontWeight: "800", color: "#15803d" },
});
