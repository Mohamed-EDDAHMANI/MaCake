import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
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

type OrderStatus = "pending" | "accepted" | "preparing" | "delivering" | "delivered" | "refused";
type OrderCardData = ClientOrder & {
  title: string;
  chefName: string;
  imageUri?: string;
  requestedDateTimeText: string;
};

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  delivering: 3,
  delivered: 4,
  refused: 5,
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
  delivering: { bg: "#e0e7ff", text: "#4338ca", label: "Delivering" },
  delivered: { bg: "#dcfce7", text: "#15803d", label: "Delivered" },
  refused: { bg: "#fee2e2", text: "#b91c1c", label: "Refused" },
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  })} • ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function buildUiTitle(order: ClientOrder): string {
  if (order.items.length === 0) return `Order #${order.id.slice(-6)}`;
  const first = order.items[0];
  if (order.items.length === 1) return `Product ${first.productId.slice(-6)}`;
  return `Product ${first.productId.slice(-6)} +${order.items.length - 1}`;
}

function orderToCard(order: ClientOrder, index: number): OrderCardData {
  return {
    ...order,
    title: buildUiTitle(order),
    chefName: order.patissiereAddress || `Patissiere ${order.patissiereId.slice(-6)}`,
    imageUri: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    requestedDateTimeText: formatDateTime(order.requestedDateTime),
  };
}

export default function ClientOrdersScreen() {
  const router = useRouter();
  const authUserId = useAppSelector((state) => state.auth.user?.id ?? "");
  const authRole = (useAppSelector((state) => state.auth.user?.role) ?? "").toLowerCase();
  const isPatissiere = authRole === "patissiere";
  const [orders, setOrders] = useState<OrderCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = isPatissiere ? await getPatissiereOrdersApi() : await getClientOrdersApi();
        if (!mounted) return;
        setOrders(data.map(orderToCard));
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.response?.data?.message || e?.message || "Failed to load orders.";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isPatissiere]);

  const ongoing = useMemo(
    () =>
      orders
        .filter((o) => ["pending", "accepted", "preparing", "delivering"].includes(o.status))
        .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]),
    [orders]
  );
  const history = useMemo(
    () =>
      orders
        .filter((o) => ["delivered", "refused"].includes(o.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  );
  const patissiereAsClientOrders = useMemo(
    () =>
      orders
        .filter((o) => o.clientId === authUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, authUserId]
  );
  const patissiereIncomingOrders = useMemo(
    () =>
      orders
        .filter((o) => o.patissiereId === authUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, authUserId]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <MaterialIcons name="hourglass-empty" size={22} color={SLATE_400} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <MaterialIcons name="error-outline" size={24} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.iconGhost}>
          <MaterialIcons name="shopping-bag" size={20} color={TEXT_PRIMARY} />
        </View>
        <Text style={styles.headerTitle}>Orders</Text>
        <Pressable style={styles.iconBtn}>
          <MaterialIcons name="tune" size={20} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isPatissiere ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Purchase Orders</Text>
              {patissiereAsClientOrders.length ? (
                patissiereAsClientOrders.map((order) => (
                  <OrderCard
                    key={`buy-${order.id}`}
                    order={order}
                    history={["delivered", "refused"].includes(order.status)}
                    onViewDetails={() =>
                      router.push({ pathname: "/(main)/order/[id]", params: { id: order.id } } as any)
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No purchase orders yet.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Orders To Prepare</Text>
              {patissiereIncomingOrders.length ? (
                patissiereIncomingOrders.map((order) => (
                  <OrderCard
                    key={`prepare-${order.id}`}
                    order={order}
                    history={["delivered", "refused"].includes(order.status)}
                    onViewDetails={() =>
                      router.push({ pathname: "/(main)/order/[id]", params: { id: order.id } } as any)
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No incoming orders to prepare.</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ongoing Orders</Text>
              {ongoing.length ? (
                ongoing.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={() =>
                      router.push({ pathname: "/(main)/order/[id]", params: { id: order.id } } as any)
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No ongoing orders right now.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order History</Text>
              {history.length ? (
                history.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    history
                    onViewDetails={() =>
                      router.push({ pathname: "/(main)/order/[id]", params: { id: order.id } } as any)
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No delivered orders yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  history = false,
  onViewDetails,
}: {
  order: OrderCardData;
  history?: boolean;
  onViewDetails: () => void;
}) {
  const status = statusMap[order.status];
  return (
    <View style={[styles.card, history && styles.cardHistory]}>
      <View style={styles.cardTop}>
        <Image source={{ uri: order.imageUri }} style={styles.image} contentFit="cover" />
        <View style={styles.info}>
          <View style={styles.rowBetween}>
            <Text style={styles.title} numberOfLines={1}>
              {order.title}
            </Text>
            <View style={[styles.chip, { backgroundColor: status.bg }]}>
              <Text style={[styles.chipText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.chef}>{order.chefName}</Text>
          <Text style={styles.meta}>
            {order.totalPrice.toFixed(2)} EUR • {formatDate(order.createdAt)}
          </Text>
          <Text style={styles.meta}>{order.requestedDateTimeText}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {order.deliveryAddressSource === "profile" ? "Profile address" : "Current location"} •{" "}
            {order.deliveryAddress}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.mainBtn, history && styles.secondaryBtn]} onPress={onViewDetails}>
          <Text style={[styles.mainBtnText, history && styles.secondaryBtnText]}>
            View Details
          </Text>
        </Pressable>
        <Pressable style={styles.reviewBtn}>
          <MaterialIcons name="rate-review" size={16} color={PRIMARY} />
          <Text style={styles.reviewBtnText}>{history ? "Read Review" : "Write Review"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_05,
  },
  content: { padding: 14, gap: 20, paddingBottom: 32 },
  section: { gap: 10 },
  sectionTitle: {
    marginLeft: 2,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: SLATE_400,
    fontWeight: "800",
  },
  emptyText: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 12,
    padding: 12,
    color: SLATE_500,
    fontSize: 13,
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
  cardTop: { flexDirection: "row", gap: 10 },
  image: { width: 78, height: 78, borderRadius: 10, backgroundColor: BORDER_SUBTLE },
  info: { flex: 1, gap: 2, paddingTop: 2 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY },
  chef: { fontSize: 12, color: SLATE_500, fontWeight: "600" },
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  loadingText: { color: SLATE_500, fontSize: 13, fontWeight: "600" },
  errorText: { color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center" },
});
