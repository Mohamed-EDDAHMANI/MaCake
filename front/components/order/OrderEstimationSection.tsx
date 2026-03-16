import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  PRIMARY,
  SURFACE,
  TEXT_PRIMARY,
  SLATE_200,
  SLATE_500,
  SLATE_600,
  SLATE_700,
  BORDER_SUBTLE,
  BORDER,
  BACKGROUND_LIGHT,
} from "@/constants/colors";
import {
  getEstimationsByOrderIdApi,
  acceptDeliveryOfferApi,
  type EstimationItem,
} from "@/store/features/estimation";
import { getOrderSocket } from "@/lib/order-socket";
import { getProfileById } from "@/store/features/auth/authApi";
import type { ProfileRating } from "@/store/features/auth/authApi";
import { buildPhotoUrl } from "@/lib/utils";
import { MaterialIcons } from "@expo/vector-icons";

export interface OrderEstimationSectionProps {
  orderId: string;
  /** When this value changes, estimations list is refetched (e.g. after modal submit) */
  refetchTrigger?: number;
  /** Show "Your estimation" block for client; if false, only display delivery list */
  isClient?: boolean;
  /** Order total for Pay button (client) */
  orderTotal?: number;
  /** Order status to hide Pay when already delivered */
  orderStatus?: string;
}

function formatEstimationTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderEstimationSection({
  orderId,
  refetchTrigger = 0,
  isClient = true,
  orderTotal = 0,
  orderStatus,
}: OrderEstimationSectionProps) {
  const router = useRouter();
  const [list, setList] = useState<EstimationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEstimations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEstimationsByOrderIdApi(orderId);
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchEstimations();
  }, [fetchEstimations, refetchTrigger]);

  // Real-time: refetch when an estimation is created for this order (client or delivery)
  useEffect(() => {
    const socket = getOrderSocket();
    const handler = (payload: { orderId?: string }) => {
      if (payload?.orderId === orderId) fetchEstimations();
    };
    socket.on("estimation.created", handler);
    return () => {
      socket.off("estimation.created", handler);
    };
  }, [orderId, fetchEstimations]);

  const clientEstimations = list.filter((e) => e.userRole === "client");
  const deliveryEstimations = list.filter((e) => e.userRole === "delivery");
  const acceptedClientEstimation = isClient ? clientEstimations.find((e) => e.status === "confirmed") : null;
  const showPayButton =
    isClient &&
    acceptedClientEstimation &&
    !acceptedClientEstimation.paidAt &&
    orderStatus !== "delivered" &&
    acceptedClientEstimation.price > 0;

  const handlePay = () => {
    if (!acceptedClientEstimation) return;
    router.push({
      pathname: "/(main)/payment",
      params: {
        orderId,
        total: String(acceptedClientEstimation.price),
        estimationId: acceptedClientEstimation.id,
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estimations</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading estimations...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Part 1: Your estimation (client) */}
          <View style={styles.part}>
            <Text style={styles.partTitle}>Your estimation</Text>
            {clientEstimations.length > 0 ? (
              <View style={styles.estimationList}>
                {clientEstimations.map((e) =>
                  isClient && e.status === "confirmed" && e.acceptedBy ? (
                    <ClientAcceptedEstimationCard
                      key={e.id}
                      item={e}
                      onPay={showPayButton ? handlePay : undefined}
                    />
                  ) : (
                    <EstimationCard key={e.id} item={e} />
                  )
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>No client estimation yet.</Text>
            )}
          </View>

          {/* Part 2: Delivery estimations (horizontal scroll — cards one after another) */}
          <View style={styles.part}>
            <Text style={styles.partTitle}>
              Delivery estimations {deliveryEstimations.length > 0 ? `(${deliveryEstimations.length})` : ""}
            </Text>
            {deliveryEstimations.length > 0 ? (
              <ScrollView
                horizontal
                style={styles.deliveryEstimationsScroll}
                contentContainerStyle={styles.deliveryEstimationsScrollContent}
                showsHorizontalScrollIndicator={true}
              >
                {deliveryEstimations.map((e) => (
                  <View key={e.id} style={styles.deliveryEstimationCardWrap}>
                    <DeliveryEstimationCard
                      item={e}
                      isClient={isClient}
                      canAccept={!!(isClient && !acceptedClientEstimation)}
                      onAccept={fetchEstimations}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No delivery estimations yet.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ClientAcceptedEstimationCard({
  item,
  onPay,
}: {
  item: EstimationItem;
  onPay?: () => void;
}) {
  const [deliveryProfile, setDeliveryProfile] = useState<{ name: string; photo: string | null } | null>(null);

  useEffect(() => {
    if (!item.acceptedBy) return;
    let cancelled = false;
    getProfileById(item.acceptedBy)
      .then((res) => {
        if (cancelled || !res?.data?.user) return;
        const u = res.data.user as { name?: string; photo?: string | null };
        setDeliveryProfile({ name: u.name ?? "Delivery", photo: u.photo ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.acceptedBy]);

  return (
    <View style={[styles.card, styles.cardAccepted]}>
      <View style={styles.acceptedBadgeRow}>
        <View style={styles.acceptedBadge}>
          <MaterialIcons name="check-circle" size={14} color="#15803d" />
          <Text style={styles.acceptedBadgeText}>Accepted by delivery</Text>
        </View>
        <Text style={styles.cardPrice}>{item.price.toFixed(2)} EUR</Text>
      </View>
      <Text style={styles.cardDetails} numberOfLines={4}>{item.details}</Text>
      <Text style={styles.cardTime}>{formatEstimationTime(item.createdAt)}</Text>

      {deliveryProfile ? (
        <View style={styles.deliveryRow}>
          {deliveryProfile.photo ? (
            <Image
              source={{ uri: buildPhotoUrl(deliveryProfile.photo)! }}
              style={styles.deliveryAvatar}
            />
          ) : (
            <View style={[styles.deliveryAvatar, styles.deliveryAvatarPlaceholder]}>
              <MaterialIcons name="local-shipping" size={18} color={PRIMARY} />
            </View>
          )}
          <Text style={styles.deliveryName}>{deliveryProfile.name}</Text>
        </View>
      ) : null}

      {item.paidAt ? (
        <View style={styles.paidBadge}>
          <MaterialIcons name="check-circle" size={18} color="#15803d" />
          <Text style={styles.paidBadgeText}>Paid</Text>
        </View>
      ) : onPay ? (
        <Pressable style={styles.payBtn} onPress={onPay}>
          <MaterialIcons name="payments" size={18} color="#fff" />
          <Text style={styles.payBtnText}>Pay</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 5-star row: filled color reflects rating (e.g. 4.2 → 4 filled amber, 1 outline). */
function StarRating({
  rating,
  count,
  starSize = 14,
}: {
  rating: number;
  count: number;
  starSize?: number;
}) {
  const clamped = Math.min(5, Math.max(0, rating));
  const full = Math.round(clamped);
  const empty = 5 - full;
  const filledColor = "#f59e0b";
  const outlineColor = "#e2e8f0";

  return (
    <View style={styles.starRatingRow}>
      {Array.from({ length: full }, (_, i) => (
        <MaterialIcons key={`f-${i}`} name="star" size={starSize} color={filledColor} />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <MaterialIcons key={`e-${i}`} name="star-border" size={starSize} color={outlineColor} />
      ))}
      <Text style={styles.ratingCount}>({count})</Text>
    </View>
  );
}

function DeliveryEstimationCard({
  item,
  isClient,
  canAccept,
  onAccept,
}: {
  item: EstimationItem;
  isClient: boolean;
  canAccept: boolean;
  onAccept: () => void;
}) {
  const [profile, setProfile] = useState<{
    name: string;
    photo: string | null;
    rating: ProfileRating;
  } | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const deliveryId = item.createdBy ?? null;
    if (!deliveryId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    getProfileById(deliveryId)
      .then((res) => {
        if (cancelled || !res?.data) return;
        const u = (res.data as { user?: { name?: string; photo?: string | null }; rating?: ProfileRating }).user;
        const rating = (res.data as { rating?: ProfileRating }).rating ?? { average: 0, count: 0 };
        if (u) {
          setProfile({
            name: u.name ?? "Delivery",
            photo: u.photo ?? null,
            rating,
          });
        } else {
          setProfile({ name: "Delivery", photo: null, rating: { average: 0, count: 0 } });
        }
      })
      .catch(() => setProfile({ name: "Delivery", photo: null, rating: { average: 0, count: 0 } }));
    return () => {
      cancelled = true;
    };
  }, [item.createdBy]);

  const handleAccept = async () => {
    if (!canAccept || accepting) return;
    try {
      setAccepting(true);
      const result = await acceptDeliveryOfferApi(item.id);
      if (result?.success !== true) {
        Alert.alert(
          "Could not accept offer",
          (result as any)?.message ?? "Something went wrong. Try again."
        );
        return;
      }
      onAccept();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        "Could not accept delivery offer. Try again.";
      Alert.alert("Error", msg);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.cardPrice}>{item.price.toFixed(2)} EUR</Text>
      </View>
      <Text style={styles.cardDetails} numberOfLines={4}>{item.details}</Text>
      <Text style={styles.cardTime}>{formatEstimationTime(item.createdAt)}</Text>

      <View style={styles.deliveryInfoRow}>
        {profile?.photo ? (
          <Image source={{ uri: buildPhotoUrl(profile.photo)! }} style={styles.deliveryCardAvatar} />
        ) : (
          <View style={[styles.deliveryCardAvatar, styles.deliveryAvatarPlaceholder]}>
            <MaterialIcons name="local-shipping" size={20} color={PRIMARY} />
          </View>
        )}
        <View style={styles.deliveryInfoBlock}>
          <Text style={styles.deliveryName}>{profile?.name ?? "—"}</Text>
          <StarRating
            rating={profile?.rating?.average ?? 0}
            count={profile?.rating?.count ?? 0}
            starSize={14}
          />
        </View>
      </View>

      {isClient && canAccept ? (
        <Pressable
          style={[styles.acceptOfferBtn, accepting && styles.acceptOfferBtnDisabled]}
          onPress={handleAccept}
          disabled={accepting}
        >
          <MaterialIcons name="check-circle" size={18} color="#fff" />
          <Text style={styles.acceptOfferBtnText}>{accepting ? "Accepting..." : "Accept"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EstimationCard({ item }: { item: EstimationItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.badge, item.userRole === "client" ? styles.badgeClient : styles.badgeDelivery]}>
          <Text style={styles.badgeText}>{item.userRole}</Text>
        </View>
        <Text style={styles.cardPrice}>{item.price.toFixed(2)} EUR</Text>
      </View>
      <Text style={styles.cardDetails} numberOfLines={4}>{item.details}</Text>
      <Text style={styles.cardTime}>{formatEstimationTime(item.createdAt)} • {item.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    overflow: "hidden",
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: SLATE_500,
    fontWeight: "600",
  },
  scroll: { maxHeight: 480 },
  scrollContent: { padding: 14, paddingBottom: 20 },
  part: {
    marginBottom: 18,
  },
  partTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: SLATE_600,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  deliveryEstimationsScroll: {
    marginHorizontal: -14,
  },
  deliveryEstimationsScrollContent: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    paddingRight: 14,
  },
  deliveryEstimationCardWrap: {
    width: 280,
    flexShrink: 0,
  },
  estimationList: { gap: 10 },
  card: {
    backgroundColor: BACKGROUND_LIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
  },
  cardAccepted: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
  acceptedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  acceptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  acceptedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#bbf7d0",
  },
  deliveryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  deliveryAvatarPlaceholder: {
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryName: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#dcfce7",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  paidBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803d",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeClient: { backgroundColor: "#dbeafe" },
  badgeDelivery: { backgroundColor: "#e0e7ff" },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: SLATE_700,
    textTransform: "uppercase",
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
  },
  cardDetails: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "500",
    marginBottom: 6,
  },
  cardTime: {
    fontSize: 11,
    color: SLATE_500,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    color: SLATE_500,
    fontStyle: "italic",
  },
  starRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: SLATE_600,
    fontWeight: "600",
    marginLeft: 4,
  },
  deliveryInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
  },
  deliveryCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SLATE_200,
  },
  deliveryInfoBlock: { flex: 1, minWidth: 0 },
  acceptOfferBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803d",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  acceptOfferBtnDisabled: { opacity: 0.7 },
  acceptOfferBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});
