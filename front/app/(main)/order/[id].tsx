import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BACKGROUND_LIGHT,
  BORDER_SUBTLE,
  PRIMARY,
  PRIMARY_05,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SURFACE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import { getClientOrderByIdApi, type ClientOrder } from "@/store/features/order/orderApi";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop";
const MAP_IMAGE =
  "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?q=80&w=1200&auto=format&fit=crop";

type TimelineStep = "pending" | "accepted" | "preparing" | "delivering" | "delivered";

const STEPS: Array<{ key: TimelineStep; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: "pending", label: "Order Pending", icon: "hourglass-empty" },
  { key: "accepted", label: "Accepted", icon: "task-alt" },
  { key: "preparing", label: "Preparing", icon: "bakery-dining" },
  { key: "delivering", label: "Delivering", icon: "local-shipping" },
  { key: "delivered", label: "Delivered", icon: "flag" },
];

const STEP_INDEX: Record<TimelineStep | "refused", number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  delivering: 3,
  delivered: 4,
  refused: 0,
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} • ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

function formatHour(value: Date): string {
  return value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function buildTitle(order: ClientOrder): string {
  if (!order.items.length) return `Order #${order.id.slice(-6).toUpperCase()}`;
  const first = order.items[0];
  if (order.items.length === 1) return `Product ${first.productId.slice(-6)}`;
  return `Product ${first.productId.slice(-6)} +${order.items.length - 1}`;
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<ClientOrder | null>(null);

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
      } else {
        setOrder(found);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load order details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    return STEP_INDEX[order.status];
  }, [order]);

  const eta = useMemo(() => {
    if (!order) return { start: "--:--", end: "--:--", minutesLeft: "--", progress: 0 };
    const base = new Date(order.requestedDateTime);
    if (Number.isNaN(base.getTime())) return { start: "--:--", end: "--:--", minutesLeft: "--", progress: 0 };

    const end = new Date(base.getTime() + 30 * 60 * 1000);
    const now = Date.now();
    const minutesLeft = Math.max(0, Math.ceil((end.getTime() - now) / 60000));
    const total = end.getTime() - base.getTime();
    const done = Math.min(Math.max(0, now - base.getTime()), total);
    const progress = total <= 0 ? 0 : Math.round((done / total) * 100);

    return {
      start: formatHour(base),
      end: formatHour(end),
      minutesLeft: String(minutesLeft),
      progress,
    };
  }, [order]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <MaterialIcons name="hourglass-empty" size={24} color={SLATE_400} />
          <Text style={styles.secondaryText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={24} color="#b91c1c" />
          <Text style={styles.errorText}>{error ?? "Order not found"}</Text>
          <Pressable onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isRefused = order.status === "refused";
  const orderCode = `MC-${order.id.slice(-4).toUpperCase()}`;
  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const shownProgress = isRefused ? 0 : eta.progress;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Track Order</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Image source={{ uri: FALLBACK_IMAGE }} style={styles.summaryImage} contentFit="cover" />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {buildTitle(order)}
            </Text>
            <Text style={styles.summarySub}>{order.patissiereAddress || "Chef bakery"}</Text>
            <Text style={styles.summaryCode}>Order #{orderCode}</Text>
            <Text style={styles.summaryMeta}>
              {totalQty} item{totalQty > 1 ? "s" : ""} • {order.totalPrice.toFixed(2)} EUR
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Order Status</Text>

          {isRefused ? (
            <View style={styles.refusedWrap}>
              <View style={styles.refusedIcon}>
                <MaterialIcons name="cancel" size={18} color="#b91c1c" />
              </View>
              <View style={styles.refusedInfo}>
                <Text style={styles.refusedTitle}>Order Refused</Text>
                <Text style={styles.refusedText}>This order was refused by the patissiere.</Text>
              </View>
            </View>
          ) : (
            <View>
              {STEPS.map((step, index) => {
                const completed = index < currentStepIndex;
                const active = index === currentStepIndex;
                const inactive = index > currentStepIndex;
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepVisual}>
                      <View
                        style={[
                          styles.stepDot,
                          completed && styles.stepDotDone,
                          active && styles.stepDotActive,
                          inactive && styles.stepDotIdle,
                        ]}
                      >
                        <MaterialIcons
                          name={completed ? "check" : step.icon}
                          size={14}
                          color={completed || active ? "#fff" : SLATE_400}
                        />
                      </View>
                      {index < STEPS.length - 1 ? (
                        <View style={[styles.stepLine, (completed || active) && styles.stepLineDone]} />
                      ) : null}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepLabel, active && styles.stepLabelActive, inactive && styles.stepLabelIdle]}>
                        {step.label}
                      </Text>
                      <Text style={[styles.stepTime, inactive && styles.stepTimeIdle]}>
                        {active ? "In Progress" : completed ? formatDateTime(order.createdAt) : "Waiting"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.etaCard}>
          <View style={styles.etaHead}>
            <View>
              <Text style={styles.etaTag}>Estimated Arrival</Text>
              <Text style={styles.etaRange}>
                {eta.start} - {eta.end}
              </Text>
            </View>
            <View>
              <Text style={styles.etaMinutes}>{eta.minutesLeft}</Text>
              <Text style={styles.etaMinutesLabel}>mins left</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={[styles.progressValue, { width: `${shownProgress}%` }]} />
          </View>

          <View style={styles.driverBadge}>
            <MaterialIcons name="person-pin-circle" size={20} color="#fff" />
            <Text style={styles.driverText}>
              {order.status === "delivering"
                ? "Driver is on the way"
                : order.status === "delivered"
                ? "Order delivered successfully"
                : "Order is being prepared"}
            </Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <Image source={{ uri: MAP_IMAGE }} style={styles.mapImage} contentFit="cover" />
          <View style={styles.mapOverlay} />
          <View style={styles.mapBadge}>
            <MaterialIcons name="map" size={14} color={PRIMARY} />
            <Text style={styles.mapBadgeText}>View Live Map</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_05,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: TEXT_PRIMARY },
  content: { padding: 14, gap: 14, paddingBottom: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 },
  secondaryText: { color: SLATE_500, fontSize: 13, fontWeight: "600" },
  errorText: { color: "#b91c1c", fontSize: 13, fontWeight: "600", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PRIMARY}1A`,
    padding: 10,
    flexDirection: "row",
    gap: 10,
  },
  summaryImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: BORDER_SUBTLE },
  summaryInfo: { flex: 1, justifyContent: "center" },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY },
  summarySub: { fontSize: 12, color: SLATE_500, marginTop: 1, fontWeight: "600" },
  summaryCode: { fontSize: 11, color: PRIMARY, fontWeight: "800", marginTop: 3 },
  summaryMeta: { fontSize: 11, color: SLATE_500, fontWeight: "600", marginTop: 2 },
  statusCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  statusTitle: { fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 8 },
  stepRow: { flexDirection: "row", gap: 10 },
  stepVisual: { alignItems: "center" },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SLATE_200,
    backgroundColor: "#fff",
  },
  stepDotDone: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stepDotActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stepDotIdle: { backgroundColor: "#fff", borderColor: SLATE_200 },
  stepLine: { width: 2, height: 28, backgroundColor: SLATE_200 },
  stepLineDone: { backgroundColor: PRIMARY },
  stepContent: { flex: 1, paddingTop: 3, paddingBottom: 7 },
  stepLabel: { fontSize: 13, fontWeight: "700", color: TEXT_PRIMARY },
  stepLabelActive: { color: PRIMARY, fontWeight: "800" },
  stepLabelIdle: { color: SLATE_400 },
  stepTime: { fontSize: 11, color: SLATE_500, marginTop: 1, fontWeight: "600" },
  stepTimeIdle: { color: SLATE_400 },
  etaCard: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    padding: 14,
  },
  etaHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  etaTag: { color: "#ffffffC8", fontSize: 10, textTransform: "uppercase", fontWeight: "800", letterSpacing: 1.1 },
  etaRange: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  etaMinutes: { color: "#fff", textAlign: "right", fontSize: 30, fontWeight: "900", lineHeight: 30 },
  etaMinutesLabel: { color: "#ffffffC8", fontSize: 10, textTransform: "uppercase", fontWeight: "700", textAlign: "right" },
  progressWrap: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff55",
    overflow: "hidden",
  },
  progressValue: { height: "100%", backgroundColor: "#fff", borderRadius: 999 },
  driverBadge: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff22",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  driverText: { flex: 1, color: "#fff", fontWeight: "600", fontSize: 12 },
  mapCard: {
    height: 154,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    position: "relative",
  },
  mapImage: { width: "100%", height: "100%" },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000026" },
  mapBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  mapBadgeText: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: "800" },
  refusedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 10,
  },
  refusedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  refusedInfo: { flex: 1 },
  refusedTitle: { fontSize: 13, fontWeight: "800", color: "#991b1b" },
  refusedText: { fontSize: 11, color: "#b91c1c", marginTop: 1, fontWeight: "600" },
});
