import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BACKGROUND_LIGHT,
  BORDER_SUBTLE,
  PRIMARY,
  PRIMARY_05,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SURFACE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import { getClientOrdersApi, getPatissiereOrdersApi, deleteOrderApi, type ClientOrder } from "@/store/features/order/orderApi";
import { useAppSelector } from "@/store/hooks";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";
import { getProfileById } from "@/store/features/auth/authApi";
import { buildPhotoUrl } from "@/lib/utils";
import { getOrderSocket } from "@/lib/order-socket";

type OrderStatus = "pending" | "accepted" | "preparing" | "completed" | "delivering" | "delivered" | "refused";

const ONGOING_STATUSES = new Set<OrderStatus>(["pending", "accepted", "preparing", "completed", "delivering"]);
const HISTORY_STATUSES = new Set<OrderStatus>(["delivered", "refused"]);

type OrderCardData = ClientOrder & {
  title: string;
  chefName: string;
  chefAddress: string;
  imageUri?: string;
  requestedDateTimeText: string;
};

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 0, accepted: 1, preparing: 2, completed: 3,
  delivering: 4, delivered: 5, refused: 6,
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559622214-4d6f51b0a8f5?q=80&w=500&auto=format&fit=crop",
];

const statusMap: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending:   { bg: "#dbeafe", text: "#1d4ed8", label: "Pending" },
  accepted:  { bg: "#e0f2fe", text: "#0369a1", label: "Accepted" },
  preparing: { bg: "#fef9c3", text: "#a16207", label: "Preparing" },
  completed: { bg: "#cffafe", text: "#0e7490", label: "Completed" },
  delivering:{ bg: "#e0e7ff", text: "#4338ca", label: "Delivering" },
  delivered: { bg: "#dcfce7", text: "#15803d", label: "Delivered" },
  refused:   { bg: "#fee2e2", text: "#b91c1c", label: "Refused" },
};

/* ─── Module-level caches — survive re-renders, cleared on full app restart ─── */
const productCache: Record<string, { title: string; image: string | null }> = {};
const profileCache: Record<string, { name: string; address: string | null; city: string | null }> = {};

function formatDate(value: string | Date): string {
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string | Date): string {
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} • ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function resolveImage(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return buildPhotoUrl(raw) ?? undefined;
}

/** Enrich raw orders — skips already-cached products/profiles. */
async function enrichOrders(orders: ClientOrder[]): Promise<OrderCardData[]> {
  if (orders.length === 0) return [];

  // Only fetch what's not already cached
  const missingProductIds = Array.from(
    new Set(
      orders
        .map((o) => o.firstProductId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .filter((id) => !(id in productCache))
    )
  );
  const missingProfileIds = Array.from(
    new Set(
      orders
        .map((o) => o.patissiereId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .filter((id) => !(id in profileCache))
    )
  );

  await Promise.all([
    ...missingProductIds.map((id) =>
      fetchProductByIdApi(id)
        .then((p) => { productCache[id] = { title: p.title ?? "", image: p.images?.[0] ?? null }; })
        .catch(() => { productCache[id] = { title: "", image: null }; })
    ),
    ...missingProfileIds.map((id) =>
      getProfileById(id)
        .then((res) => {
          profileCache[id] = {
            name: res?.data?.user?.name ?? "",
            address: res?.data?.user?.address ?? null,
            city: res?.data?.user?.city ?? null,
          };
        })
        .catch(() => { profileCache[id] = { name: "", address: null, city: null }; })
    ),
  ]);

  return orders.map((order, idx) => {
    const product = order.firstProductId ? productCache[order.firstProductId] : null;
    const chef = profileCache[order.patissiereId];

    const chefName = chef?.name || `Chef ${order.patissiereId.slice(-6)}`;
    const chefAddress =
      order.patissiereAddress && order.patissiereAddress !== "Patissiere address unavailable"
        ? order.patissiereAddress
        : [chef?.address, chef?.city].filter(Boolean).join(", ") || "";

    const imageUri = resolveImage(product?.image) ?? FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];

    const title = product?.title
      ? order.itemCount > 1 ? `${product.title} +${order.itemCount - 1}` : product.title
      : `Order #${order.id.slice(-6)}`;

    return {
      ...order,
      title,
      chefName,
      chefAddress,
      imageUri,
      requestedDateTimeText: formatDateTime(order.requestedDateTime),
    };
  });
}

function getOrderDetailsRoute(orderId: string): `/(main)/order/${string}` {
  return `/(main)/order/${orderId}`;
}

/* ─── Client Screen ─── */

type ClientTab = "ongoing" | "history";

function ClientOrdersView() {
  const router = useRouter();
  const [tab, setTab] = useState<ClientTab>("ongoing");
  const [ongoing, setOngoing] = useState<OrderCardData[]>([]);
  const [history, setHistory] = useState<OrderCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const loadOrders = useCallback(async () => {
    if (hasFetched.current) return;
    setLoading(true);
    setError(null);
    try {
      // Single fetch — split into ongoing/history locally
      const data = await getClientOrdersApi();

      const visible = data.filter((o) => !o.deletedByClient);

      const ongoingRaw = visible
        .filter((o) => ONGOING_STATUSES.has(o.status as OrderStatus))
        .sort((a, b) => STATUS_PRIORITY[a.status as OrderStatus] - STATUS_PRIORITY[b.status as OrderStatus]);

      const historyRaw = visible
        .filter((o) => HISTORY_STATUSES.has(o.status as OrderStatus))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Enrich both lists in a single pass (shared caches deduplicate requests)
      const [enrichedOngoing, enrichedHistory] = await Promise.all([
        enrichOrders(ongoingRaw),
        enrichOrders(historyRaw),
      ]);

      setOngoing(enrichedOngoing);
      setHistory(enrichedHistory);
      hasFetched.current = true;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Real-time status updates — only mutate state, never re-fetch
  useEffect(() => {
    const socket = getOrderSocket();
    const handler = (payload: { orderId: string; status: OrderStatus }) => {
      const isTerminal = HISTORY_STATUSES.has(payload.status);
      if (isTerminal) {
        setOngoing((prev) => {
          const moved = prev.find((o) => o.id === payload.orderId);
          if (moved) {
            setHistory((h) => {
              const exists = h.some((o) => o.id === payload.orderId);
              return exists
                ? h.map((o) => o.id === payload.orderId ? { ...o, status: payload.status } : o)
                : [{ ...moved, status: payload.status }, ...h];
            });
            return prev.filter((o) => o.id !== payload.orderId);
          }
          return prev;
        });
        setHistory((prev) => prev.map((o) => o.id === payload.orderId ? { ...o, status: payload.status } : o));
      } else {
        setOngoing((prev) => prev.map((o) => o.id === payload.orderId ? { ...o, status: payload.status } : o));
      }
    };
    socket.on("order.status.changed", handler);
    return () => { socket.off("order.status.changed", handler); };
  }, []);

  const handleDeleteOrder = async (orderId: string) => {
    if (deletingId) return;
    setDeletingId(orderId);
    try {
      await deleteOrderApi(orderId);
      setOngoing((prev) => prev.filter((o) => o.id !== orderId));
      setHistory((prev) => prev.filter((o) => o.id !== orderId));
      Alert.alert("Success", "Order deleted successfully");
    } catch {
      // silently ignore — order remains visible
    } finally {
      setDeletingId(null);
    }
  };

  const orders = tab === "ongoing" ? ongoing : history;

  return (
    <>
      <View style={styles.tabRow}>
        <TabButton label="My Orders" active={tab === "ongoing"} onPress={() => setTab("ongoing")} />
        <TabButton label="History" active={tab === "history"} onPress={() => setTab("history")} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <MaterialIcons name="error-outline" size={22} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {orders.length === 0 ? (
            <Text style={styles.emptyText}>
              {tab === "ongoing" ? "No active orders right now." : "No order history yet."}
            </Text>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isHistory={tab === "history"}
                onViewDetails={() => router.push(getOrderDetailsRoute(order.id))}
                onDeleteOrder={order.status === "refused" ? () => handleDeleteOrder(order.id) : undefined}
                isDeleting={deletingId === order.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </>
  );
}

/* ─── Patissiere Screen ─── */

type PatissiereTab = "to_prepare" | "created";

function PatissiereOrdersView() {
  const router = useRouter();
  const authUserId = useAppSelector((state) => state.auth.user?.id ?? "");
  const [tab, setTab] = useState<PatissiereTab>("to_prepare");
  const [toPrepare, setToPrepare] = useState<OrderCardData[]>([]);
  const [created, setCreated] = useState<OrderCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const loadOrders = useCallback(async () => {
    if (hasFetched.current || !authUserId) return;
    setLoading(true);
    setError(null);
    try {
      // Single fetch — split locally
      const data = await getPatissiereOrdersApi();

      const toPrepareRaw = data
        .filter((o) => o.patissiereId === authUserId && !o.deletedByPatissiere)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const createdRaw = data
        .filter((o) => o.clientId === authUserId && !o.deletedByClient)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const [enrichedToPrepare, enrichedCreated] = await Promise.all([
        enrichOrders(toPrepareRaw),
        enrichOrders(createdRaw),
      ]);

      setToPrepare(enrichedToPrepare);
      setCreated(enrichedCreated);
      hasFetched.current = true;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Real-time updates — mutate state only, no re-fetch
  useEffect(() => {
    const socket = getOrderSocket();
    const handler = (payload: { orderId: string; status: OrderStatus }) => {
      const update = (prev: OrderCardData[]) =>
        prev.map((o) => o.id === payload.orderId ? { ...o, status: payload.status } : o);
      setToPrepare(update);
      setCreated(update);
    };
    socket.on("order.status.changed", handler);
    return () => { socket.off("order.status.changed", handler); };
  }, []);

  const handleDeleteOrder = async (orderId: string) => {
    if (deletingId) return;
    setDeletingId(orderId);
    try {
      await deleteOrderApi(orderId);
      setToPrepare((prev) => prev.filter((o) => o.id !== orderId));
      setCreated((prev) => prev.filter((o) => o.id !== orderId));
      Alert.alert("Success", "Order deleted successfully");
    } catch {
      // silently ignore — order remains visible
    } finally {
      setDeletingId(null);
    }
  };

  const orders = tab === "to_prepare" ? toPrepare : created;

  return (
    <>
      <View style={styles.tabRow}>
        <TabButton label="To Accept & Prepare" active={tab === "to_prepare"} onPress={() => setTab("to_prepare")} />
        <TabButton label="My Created Orders" active={tab === "created"} onPress={() => setTab("created")} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <MaterialIcons name="error-outline" size={22} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {orders.length === 0 ? (
            <Text style={styles.emptyText}>
              {tab === "to_prepare" ? "No orders to accept or prepare." : "No created orders yet."}
            </Text>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={`${tab}-${order.id}`}
                order={order}
                isHistory={["delivered", "refused"].includes(order.status)}
                onViewDetails={() => router.push(getOrderDetailsRoute(order.id))}
                isPatissiere
                onDeleteOrder={() => handleDeleteOrder(order.id)}
                isDeleting={deletingId === order.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </>
  );
}

/* ─── Root Screen ─── */

export default function ClientOrdersScreen() {
  const authRole = (useAppSelector((state) => state.auth.user?.role) ?? "").toLowerCase();
  const isPatissiere = authRole === "patissiere";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.iconGhost}>
          <MaterialIcons name="shopping-bag" size={20} color={TEXT_PRIMARY} />
        </View>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.iconGhost} />
      </View>

      {isPatissiere ? <PatissiereOrdersView /> : <ClientOrdersView />}
    </SafeAreaView>
  );
}

/* ─── Shared components ─── */

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function ConfirmDeleteModal({
  visible,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <View style={modal.card}>
          <View style={modal.iconWrap}>
            <MaterialIcons name="delete-outline" size={28} color="#dc2626" />
          </View>
          <Text style={modal.title}>Delete Order?</Text>
          <Text style={modal.body}>
            This action cannot be undone. The order will be permanently removed.
          </Text>
          <View style={modal.btnRow}>
            <Pressable style={[modal.btn, modal.cancelBtn]} onPress={onCancel} disabled={isDeleting}>
              <Text style={modal.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[modal.btn, modal.confirmBtn, isDeleting && modal.btnDisabled]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              <Text style={modal.confirmText}>{isDeleting ? "Deleting…" : "Delete"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OrderCard({
  order,
  isHistory = false,
  onViewDetails,
  isPatissiere = false,
  onDeleteOrder,
  isDeleting = false,
}: {
  order: OrderCardData;
  isHistory?: boolean;
  onViewDetails: () => void;
  isPatissiere?: boolean;
  onDeleteOrder?: () => void;
  isDeleting?: boolean;
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const status = statusMap[order.status as OrderStatus];
  const isRefused = order.status === "refused";
  const showDeleteButton = isRefused && !!onDeleteOrder;

  return (
    <View style={[styles.card, isHistory && styles.cardHistory, isRefused && styles.cardRefused]}>
      <View style={styles.cardTop}>
        <Image source={{ uri: order.imageUri }} style={styles.image} contentFit="cover" />
        <View style={styles.info}>
          <View style={styles.rowBetween}>
            <Text style={styles.title} numberOfLines={1}>{order.title}</Text>
            <View style={[styles.chip, { backgroundColor: status.bg }]}>
              <Text style={[styles.chipText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.chef}>{order.chefName}</Text>
          {Boolean(order.chefAddress) && (
            <Text style={styles.chefAddress} numberOfLines={1}>{order.chefAddress}</Text>
          )}
          <Text style={styles.meta}>
            {order.totalPrice.toFixed(2)} MAD • {formatDate(order.createdAt)}
          </Text>
          <Text style={styles.meta}>{order.requestedDateTimeText}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {order.deliveryAddressSource === "profile" ? "Profile address" : "Current location"} •{" "}
            {order.deliveryAddress}
          </Text>
        </View>
      </View>

      {isRefused && (
        <View style={styles.refusedBanner}>
          <MaterialIcons name="cancel" size={14} color="#b91c1c" />
          <Text style={styles.refusedBannerText}>This order was refused by the patissiere.</Text>
        </View>
      )}

      {showDeleteButton ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.mainBtn, styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
            onPress={() => setConfirmVisible(true)}
            disabled={isDeleting}
          >
            <MaterialIcons name="delete-outline" size={16} color="#fff" />
            <Text style={styles.mainBtnText}>{isDeleting ? "Deleting..." : "Delete Order"}</Text>
          </Pressable>
          <ConfirmDeleteModal
            visible={confirmVisible}
            onCancel={() => setConfirmVisible(false)}
            onConfirm={() => { setConfirmVisible(false); onDeleteOrder?.(); }}
            isDeleting={isDeleting}
          />
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable style={[styles.mainBtn, isHistory && styles.secondaryBtn]} onPress={onViewDetails}>
            <Text style={[styles.mainBtnText, isHistory && styles.secondaryBtnText]}>View Details</Text>
          </Pressable>
          <Pressable style={styles.reviewBtn} onPress={onViewDetails}>
            <MaterialIcons name="rate-review" size={16} color={PRIMARY} />
            <Text style={styles.reviewBtnText}>{isHistory ? "Read Review" : "Write Review"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT_PRIMARY },
  iconGhost: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    margin: 14,
    marginBottom: 4,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: PRIMARY_05,
    borderWidth: 1,
    borderColor: `${PRIMARY}33`,
  },
  tabText: { fontSize: 11, fontWeight: "700", color: SLATE_500 },
  tabTextActive: { color: PRIMARY, fontWeight: "800" },
  content: { padding: 14, paddingTop: 10, gap: 10, paddingBottom: 32 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  loadingText: { color: SLATE_500, fontSize: 13, fontWeight: "600" },
  errorText: { color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center", paddingHorizontal: 20 },
  emptyText: {
    margin: 14,
    marginTop: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 12,
    padding: 14,
    color: SLATE_500,
    fontSize: 13,
    textAlign: "center",
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    padding: 10,
    gap: 10,
  },
  cardHistory: { opacity: 0.94, borderColor: BORDER_SUBTLE },
  cardRefused: { borderColor: "#fca5a5", borderWidth: 1.5 },
  refusedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  refusedBannerText: { fontSize: 12, color: "#b91c1c", fontWeight: "600", flex: 1 },
  cardTop: { flexDirection: "row", gap: 10 },
  image: { width: 78, height: 78, borderRadius: 10, backgroundColor: BORDER_SUBTLE },
  info: { flex: 1, gap: 2, paddingTop: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY },
  chef: { fontSize: 12, color: SLATE_500, fontWeight: "600" },
  chefAddress: { fontSize: 11, color: SLATE_400, fontWeight: "500" },
  meta: { fontSize: 11, color: SLATE_500, fontWeight: "600" },
  chip: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    paddingTop: 10,
  },
  mainBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  deleteBtn: { backgroundColor: "#dc2626" },
  deleteBtnDisabled: { opacity: 0.6 },
  mainBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  secondaryBtn: { backgroundColor: "#eef2f7" },
  secondaryBtnText: { color: SLATE_600 },
  reviewBtn: {
    minWidth: 120,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: PRIMARY_05,
    borderWidth: 1,
    borderColor: `${PRIMARY}22`,
  },
  reviewBtnText: { color: PRIMARY, fontSize: 12, fontWeight: "800" },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111827", textAlign: "center" },
  body: { fontSize: 13, color: SLATE_500, textAlign: "center", lineHeight: 19 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 6, width: "100%" },
  btn: { flex: 1, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cancelBtn: { backgroundColor: "#f1f5f9" },
  confirmBtn: { backgroundColor: "#dc2626" },
  btnDisabled: { opacity: 0.6 },
  cancelText: { fontSize: 14, fontWeight: "700", color: SLATE_600 },
  confirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
