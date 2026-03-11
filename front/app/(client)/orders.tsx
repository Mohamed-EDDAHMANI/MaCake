import { useMemo } from "react";
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

type OrderStatus = "pending" | "accepted" | "preparing" | "delivering" | "delivered" | "refused";
type OrderSource = "profile" | "current_location";

type OrderCardData = {
  id: string;
  title: string;
  chefName: string;
  imageUri: string;
  status: OrderStatus;
  totalPrice: number;
  requestedDateTime: string;
  deliveryAddress: string;
  deliveryAddressSource: OrderSource;
  createdAt: string;
};

const MOCK_ORDERS: OrderCardData[] = [
  {
    id: "ord_9f1a",
    title: "Boutique Chocolate Fondant",
    chefName: "Chef Clara Bloom",
    imageUri:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop",
    status: "pending",
    totalPrice: 45,
    requestedDateTime: "2026-03-11T15:30:00.000Z",
    deliveryAddress: "Talborjt, Agadir",
    deliveryAddressSource: "profile",
    createdAt: "2026-03-11T10:04:00.000Z",
  },
  {
    id: "ord_61bc",
    title: "Velvet Berry Cheesecake",
    chefName: "Chef Marc Pastry",
    imageUri:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=500&auto=format&fit=crop",
    status: "delivered",
    totalPrice: 32.5,
    requestedDateTime: "2026-03-09T11:30:00.000Z",
    deliveryAddress: "Hay Salam, Agadir",
    deliveryAddressSource: "current_location",
    createdAt: "2026-03-08T17:44:00.000Z",
  },
  {
    id: "ord_35de",
    title: "Glazed Luxury Tower",
    chefName: "Sweets by Sofia",
    imageUri:
      "https://images.unsplash.com/photo-1559622214-4d6f51b0a8f5?q=80&w=500&auto=format&fit=crop",
    status: "delivered",
    totalPrice: 58,
    requestedDateTime: "2026-03-03T12:00:00.000Z",
    deliveryAddress: "Inezgane, Agadir",
    deliveryAddressSource: "profile",
    createdAt: "2026-03-02T19:10:00.000Z",
  },
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

export default function ClientOrdersScreen() {
  const ongoing = useMemo(
    () => MOCK_ORDERS.filter((o) => ["pending", "accepted", "preparing", "delivering"].includes(o.status)),
    []
  );
  const history = useMemo(
    () => MOCK_ORDERS.filter((o) => ["delivered", "refused"].includes(o.status)),
    []
  );

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ongoing Orders</Text>
          {ongoing.length ? (
            ongoing.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <Text style={styles.emptyText}>No ongoing orders right now.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order History</Text>
          {history.length ? (
            history.map((order) => <OrderCard key={order.id} order={order} history />)
          ) : (
            <Text style={styles.emptyText}>No delivered orders yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, history = false }: { order: OrderCardData; history?: boolean }) {
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
          <Text style={styles.meta} numberOfLines={1}>
            {order.deliveryAddressSource === "profile" ? "Profile address" : "Current location"} •{" "}
            {order.deliveryAddress}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.mainBtn, history && styles.secondaryBtn]}>
          <Text style={[styles.mainBtnText, history && styles.secondaryBtnText]}>
            {history ? "Order Again" : "View Details"}
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
});
