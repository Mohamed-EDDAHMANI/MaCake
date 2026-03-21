import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
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
import { getClientOrdersApi, getPatissiereOrdersApi, type ClientOrder } from "@/store/features/order/orderApi";
import { useAppSelector } from "@/store/hooks";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";
import { getProfileById } from "@/store/features/auth/authApi";
import { buildPhotoUrl } from "@/lib/utils";
import { getOrderSocket } from "@/lib/order-socket";

type OrderStatus = "pending" | "accepted" | "preparing" | "completed" | "delivering" | "delivered" | "refused";

const ONGOING_STATUSES: OrderStatus[] = ["pending", "accepted", "preparing", "completed", "delivering"];
const HISTORY_STATUSES: OrderStatus[] = ["delivered", "refused"];

type OrderCardData = ClientOrder & {
  title: string;
  chefName: string;
  chefAddress: string;
  imageUri?: string;
  requestedDateTimeText: string;
};

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  completed: 3,
  delivering: 4,
  delivered: 5,
  refused: 6,
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559622214-4d6f51b0a8f5?q=80&w=500&auto=format&fit=crop",
];

const statusMap: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "#dbeafe", text: "#1d4ed8", label: "Pending" },
  accepted: { bg: "#e0f2fe", text: "#0369a1", label: "Accepted" },
  preparing: { bg: "#fef9c3", text: "#a16207", label: "Preparing" },
  completed: { bg: "#cffafe", text: "#0e7490", label: "Completed" },
  delivering: { bg: "#e0e7ff", text: "#4338ca", label: "Delivering" },
  delivered: { bg: "#dcfce7", text: "#15803d", label: "Delivered" },
  refused: { bg: "#fee2e2", text: "#b91c1c", label: "Refused" },
};

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

/** Enrich raw orders with product + patissiere data using existing proven endpoints. */
async function enrichOrders(orders: ClientOrder[]): Promise<OrderCardData[]> {
  if (orders.length === 0) return [];

  // Deduplicate IDs so we don't fetch the same resource twice
  const uniqueProductIds = Array.from(
    new Set(orders.map((o) => o.firstProductId).filter((id): id is string => Boolean(id)))
  );
  const uniquePatissiereIds = Array.from(
    new Set(orders.map((o) => o.patissiereId).filter(Boolean))
  );

  // Fire all requests in parallel — Promise.allSettled never throws
  const [productResults, patissiereResults] = await Promise.all([
    Promise.allSettled(
      uniqueProductIds.map((id) =>
        fetchProductByIdApi(id).then((p) => ({
          id,
          title: p.title ?? "",
          image: p.images?.[0] ?? null,
        }))
      )
    ),
    Promise.allSettled(
      uniquePatissiereIds.map((id) =>
        getProfileById(id).then((res) => ({
          id,
          name: res?.data?.user?.name ?? "",
          address: res?.data?.user?.address ?? null,
          city: res?.data?.user?.city ?? null,
        }))
      )
    ),
  ]);

  // Build lookup maps
  const productById: Record<string, { title: string; image: string | null }> = {};
  for (const r of productResults) {
    if (r.status === "fulfilled" && r.value.id) {
      productById[r.value.id] = { title: r.value.title, image: r.value.image };
    }
  }

  const patissiereById: Record<string, { name: string; address: string | null; city: string | null }> = {};
  for (const r of patissiereResults) {
    if (r.status === "fulfilled" && r.value.id) {
      patissiereById[r.value.id] = { name: r.value.name, address: r.value.address, city: r.value.city };
    }
  }

  return orders.map((order, idx) => {
    const product = order.firstProductId ? productById[order.firstProductId] : null;
    const chef = patissiereById[order.patissiereId];

    const chefName = chef?.name || `Chef ${order.patissiereId.slice(-6)}`;
    const chefAddress =
      order.patissiereAddress && order.patissiereAddress !== "Patissiere address unavailable"
        ? order.patissiereAddress
        : [chef?.address, chef?.city].filter(Boolean).join(", ") || "";

    const rawImage = product?.image ?? null;
    const imageUri = resolveImage(rawImage) ?? FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];

    const productName = product?.title ?? "";
    const title = productName
      ? order.itemCount > 1
        ? `${productName} +${order.itemCount - 1}`
        : productName
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
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorOngoing, setErrorOngoing] = useState<string | null>(null);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const fetchedOngoing = useRef(false);
  const fetchedHistory = useRef(false);

  const loadTab = useCallback(async (which: ClientTab) => {
    if (which === "ongoing") {
      if (fetchedOngoing.current) return;
      setLoadingOngoing(true);
      setErrorOngoing(null);
      try {
        const data = await getClientOrdersApi();
        const filtered = data.filter((o) => ONGOING_STATUSES.includes(o.status as OrderStatus));
        const sorted = filtered.sort((a, b) => STATUS_PRIORITY[a.status as OrderStatus] - STATUS_PRIORITY[b.status as OrderStatus]);
        const enriched = await enrichOrders(sorted);
        setOngoing(enriched);
        fetchedOngoing.current = true;
      } catch (e: any) {
        setErrorOngoing(e?.response?.data?.message || e?.message || "Failed to load orders.");
      } finally {
        setLoadingOngoing(false);
      }
    } else {
      if (fetchedHistory.current) return;
      setLoadingHistory(true);
      setErrorHistory(null);
      try {
        const data = await getClientOrdersApi();
        const filtered = data.filter((o) => HISTORY_STATUSES.includes(o.status as OrderStatus));
        const sorted = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const enriched = await enrichOrders(sorted);
        setHistory(enriched);
        fetchedHistory.current = true;
      } catch (e: any) {
        setErrorHistory(e?.response?.data?.message || e?.message || "Failed to load history.");
      } finally {
        setLoadingHistory(false);
      }
    }
  }, []);

  // Load initial tab on mount
  useEffect(() => { loadTab("ongoing"); }, [loadTab]);

  // Load other tab when switched
  const handleTabSwitch = (next: ClientTab) => {
    setTab(next);
    loadTab(next);
  };

  // Realtime status update
  useEffect(() => {
    const socket = getOrderSocket();
    const handler = (payload: { orderId: string; status: OrderStatus }) => {
      const isTerminal = HISTORY_STATUSES.includes(payload.status);
      if (isTerminal) {
        // Move order from ongoing to history
        setOngoing((prev) => {
          const moved = prev.find((o) => o.id === payload.orderId);
          if (moved) {
            setHistory((h) => {
              const alreadyInHistory = h.some((o) => o.id === payload.orderId);
              if (alreadyInHistory) return h.map((o) => o.id === payload.orderId ? { ...o, status: payload.status } : o);
              return [{ ...moved, status: payload.status }, ...h];
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

  const loading = tab === "ongoing" ? loadingOngoing : loadingHistory;
  const error = tab === "ongoing" ? errorOngoing : errorHistory;
  const orders = tab === "ongoing" ? ongoing : history;

  return (
    <>
      <View style={styles.tabRow}>
        <TabButton label="My Orders" active={tab === "ongoing"} onPress={() => handleTabSwitch("ongoing")} />
        <TabButton label="History" active={tab === "history"} onPress={() => handleTabSwitch("history")} />
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
              />
            ))
          )}
        </ScrollView>
      )}
    </>
  );
}

/* ─── Patissiere Screen ─── */

type PatissiereTab = "created" | "to_prepare";

function PatissiereOrdersView() {
  const router = useRouter();
  const authUserId = useAppSelector((state) => state.auth.user?.id ?? "");
  const [tab, setTab] = useState<PatissiereTab>("to_prepare");
  const [created, setCreated] = useState<OrderCardData[]>([]);
  const [toPrepare, setToPrepare] = useState<OrderCardData[]>([]);
  const [loadingCreated, setLoadingCreated] = useState(false);
  const [loadingToPrepare, setLoadingToPrepare] = useState(false);
  const [errorCreated, setErrorCreated] = useState<string | null>(null);
  const [errorToPrepare, setErrorToPrepare] = useState<string | null>(null);
  const fetchedCreated = useRef(false);
  const fetchedToPrepare = useRef(false);

  const loadTab = useCallback(async (which: PatissiereTab) => {
    if (which === "created") {
      if (fetchedCreated.current) return;
      setLoadingCreated(true);
      setErrorCreated(null);
      try {
        const data = await getPatissiereOrdersApi();
        const filtered = data
          .filter((o) => o.clientId === authUserId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCreated(await enrichOrders(filtered));
        fetchedCreated.current = true;
      } catch (e: any) {
        setErrorCreated(e?.response?.data?.message || e?.message || "Failed to load orders.");
      } finally {
        setLoadingCreated(false);
      }
    } else {
      if (fetchedToPrepare.current) return;
      setLoadingToPrepare(true);
      setErrorToPrepare(null);
      try {
        const data = await getPatissiereOrdersApi();
        const filtered = data
          .filter((o) => o.patissiereId === authUserId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setToPrepare(await enrichOrders(filtered));
        fetchedToPrepare.current = true;
      } catch (e: any) {
        setErrorToPrepare(e?.response?.data?.message || e?.message || "Failed to load orders.");
      } finally {
        setLoadingToPrepare(false);
      }
    }
  }, [authUserId]);

  useEffect(() => { loadTab("to_prepare"); }, [loadTab]);

  const handleTabSwitch = (next: PatissiereTab) => {
    setTab(next);
    loadTab(next);
  };

  // Keep a ref to the current toPrepare list so the socket handler can check without stale closure
  const toPrepareRef = useRef<OrderCardData[]>([]);
  useEffect(() => { toPrepareRef.current = toPrepare; }, [toPrepare]);

  useEffect(() => {
    const socket = getOrderSocket();
    const handler = (payload: { orderId: string; status: OrderStatus }) => {
      // If the order is already in the list, just update its status
      const exists = toPrepareRef.current.some((o) => o.id === payload.orderId);
      if (exists) {
        const update = (prev: OrderCardData[]) =>
          prev.map((o) => o.id === payload.orderId ? { ...o, status: payload.status } : o);
        setCreated(update);
        setToPrepare(update);
      } else {
        // New order the patissiere hasn't loaded yet → force a fresh fetch
        fetchedToPrepare.current = false;
        fetchedCreated.current = false;
        loadTab(tab);
      }
    };
    socket.on("order.status.changed", handler);
    return () => { socket.off("order.status.changed", handler); };
  }, [loadTab, tab]);

  const loading = tab === "created" ? loadingCreated : loadingToPrepare;
  const error = tab === "created" ? errorCreated : errorToPrepare;
  const orders = tab === "created" ? created : toPrepare;

  return (
    <>
      <View style={styles.tabRow}>
        <TabButton label="My Created Orders" active={tab === "created"} onPress={() => handleTabSwitch("created")} />
        <TabButton label="To Accept & Prepare" active={tab === "to_prepare"} onPress={() => handleTabSwitch("to_prepare")} />
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
              {tab === "created" ? "No created orders yet." : "No orders to accept or prepare."}
            </Text>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={`${tab}-${order.id}`}
                order={order}
                isHistory={["delivered", "refused"].includes(order.status)}
                onViewDetails={() => router.push(getOrderDetailsRoute(order.id))}
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

function OrderCard({
  order,
  isHistory = false,
  onViewDetails,
}: {
  order: OrderCardData;
  isHistory?: boolean;
  onViewDetails: () => void;
}) {
  const status = statusMap[order.status as OrderStatus];
  return (
    <View style={[styles.card, isHistory && styles.cardHistory]}>
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

      <View style={styles.actionRow}>
        <Pressable style={[styles.mainBtn, isHistory && styles.secondaryBtn]} onPress={onViewDetails}>
          <Text style={[styles.mainBtnText, isHistory && styles.secondaryBtnText]}>View Details</Text>
        </Pressable>
        <Pressable style={styles.reviewBtn} onPress={onViewDetails}>
          <MaterialIcons name="rate-review" size={16} color={PRIMARY} />
          <Text style={styles.reviewBtnText}>{isHistory ? "Read Review" : "Write Review"}</Text>
        </Pressable>
      </View>
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
  // Tabs
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
  // Content
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
  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    padding: 10,
    gap: 10,
  },
  cardHistory: { opacity: 0.94, borderColor: BORDER_SUBTLE },
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
  },
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
