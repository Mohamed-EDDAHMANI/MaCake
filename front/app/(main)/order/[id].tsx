import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  BACKGROUND_LIGHT,
  BORDER_SUBTLE,
  PRIMARY,
  PRIMARY_05,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SURFACE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import {
  acceptOrderApi,
  completeOrderApi,
  getClientOrdersApi,
  getClientOrderByIdApi,
  getPatissiereOrdersApi,
  markDeliveredByClientApi,
  type ClientOrder,
  type ClientOrderItem,
} from "@/store/features/order/orderApi";
import { fetchProductByIdApi } from "@/store/features/catalog/catalogApi";
import { getProfileById } from "@/store/features/auth/authApi";
import type { AuthUser } from "@/store/features/auth/authSlice";
import { getEstimationsByOrderIdApi } from "@/store/features/estimation/estimationApi";
import { buildPhotoUrl, getProfilePath } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { getOrderSocket } from "@/lib/order-socket";
import { openEstimationPanel, closeEstimationPanel } from "@/store/features/estimation";
import { OrderEstimationSection } from "@/components/order/OrderEstimationSection";
import { EstimationCreateModal } from "@/components/order/EstimationCreateModal";
import { OrderRatingModal, type DeliveryForRating } from "@/components/order/OrderRatingModal";

type TimelineStep = "pending" | "accepted" | "payment" | "preparing" | "completed" | "delivering" | "delivered";

type ProductPreview = {
  title: string;
  imageUri?: string;
  description?: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500&auto=format&fit=crop";

const STEPS: Array<{ key: TimelineStep; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: "pending", label: "Order Placed", icon: "check" },
  { key: "accepted", label: "Accepted by Patissiere", icon: "check" },
  { key: "payment", label: "Payment", icon: "payments" },
  { key: "preparing", label: "Preparing your Box", icon: "adjust" },
  { key: "completed", label: "Order Completed", icon: "task-alt" },
  { key: "delivering", label: "Out for Delivery", icon: "local-shipping" },
  { key: "delivered", label: "Delivered", icon: "check-circle" },
];

const STEP_INDEX: Record<TimelineStep | "refused", number> = {
  pending: 0,
  accepted: 1,
  payment: 2,
  preparing: 3,
  completed: 4,
  delivering: 5,
  delivered: 6,
  refused: 0,
};

const STATUS_BADGE: Record<ClientOrder["status"], { bg: string; text: string; label: string }> = {
  pending: { bg: `${PRIMARY}14`, text: PRIMARY, label: "Pending" },
  accepted: { bg: "#dbeafe", text: "#1d4ed8", label: "Accepted" },
  preparing: { bg: `${PRIMARY}14`, text: PRIMARY, label: "Preparing" },
  completed: { bg: "#cffafe", text: "#0e7490", label: "Completed" },
  delivering: { bg: "#e0e7ff", text: "#4338ca", label: "Delivering" },
  delivered: { bg: "#dcfce7", text: "#15803d", label: "Delivered" },
  refused: { bg: "#fee2e2", text: "#b91c1c", label: "Refused" },
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} • ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

function formatDeliveryWindow(value: string): string {
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return "Today, --:-- - --:--";
  const end = new Date(base.getTime() + 30 * 60 * 1000);
  const dayPart = base.toDateString() === new Date().toDateString() ? "Today" : base.toLocaleDateString("en-GB");
  const from = base.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  const to = end.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  return `${dayPart}, ${from} - ${to}`;
}

function formatTimelineTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, ${d.toLocaleDateString(
    "en-GB",
    { day: "2-digit", month: "short" }
  )}`;
}

function resolveImage(raw?: string): string | undefined {
  if (!raw) return undefined;
  return buildPhotoUrl(raw) ?? undefined;
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [productById, setProductById] = useState<Record<string, ProductPreview>>({});
  const [otherParty, setOtherParty] = useState<AuthUser | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [estimationsRefresh, setEstimationsRefresh] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [deliveryForRating, setDeliveryForRating] = useState<DeliveryForRating | null>(null);
  const authUserId = useAppSelector((state) => state.auth.user?.id ?? "");
  const authRole = (useAppSelector((state) => state.auth.user?.role) ?? "").toLowerCase();
  const dispatch = useAppDispatch();
  const estimationPanelOrderId = useAppSelector((state) => state.estimation.estimationPanelOrderId);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError("Order ID missing");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setActionError(null);
      let found: ClientOrder | null = null;
      try {
        found = await getClientOrderByIdApi(id);
      } catch {
        // Fallback for gateway 403 on find-one: resolve from role-based list endpoint.
        const list = authRole === "patissiere" ? await getPatissiereOrdersApi() : await getClientOrdersApi();
        found = list.find((o) => o.id === id) ?? null;
      }
      if (!found) {
        setError("Order not found");
        setOrder(null);
        return;
      }

      setOrder(found);

      const otherPartyId = authRole === "patissiere" ? found.clientId : found.patissiereId;
      if (otherPartyId) {
        try {
          const res = await getProfileById(otherPartyId);
          if (res?.data?.user) setOtherParty(res.data.user);
          else setOtherParty(null);
        } catch {
          setOtherParty(null);
        }
      } else {
        setOtherParty(null);
      }

      const uniqueProductIds = Array.from(new Set((found.items ?? []).map((it) => it.productId).filter(Boolean)));
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
      const msg = e instanceof Error ? e.message : "Failed to load order details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, authRole]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useFocusEffect(
    useCallback(() => {
      // Refresh order details whenever the screen gains focus (e.g. after payment).
      loadOrder();
    }, [loadOrder]),
  );

  // Live status updates for this specific order
  useEffect(() => {
    if (!id) return;
    const socket = getOrderSocket();
    const handler = (payload: { orderId: string; status: ClientOrder["status"] }) => {
      if (payload.orderId !== id) return;
      setOrder((prev) => (prev ? { ...prev, status: payload.status } : prev));
    };
    socket.on("order.status.changed", handler);
    return () => {
      socket.off("order.status.changed", handler);
    };
  }, [id]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    // Payment is inserted between accepted and preparing.
    if (order.status === "accepted") return STEP_INDEX.payment;
    return STEP_INDEX[order.status];
  }, [order]);

  const breakdown = useMemo(() => {
    if (!order) return { subtotal: 0, total: 0 };
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = order.totalPrice > 0 ? order.totalPrice : subtotal;
    return { subtotal, total };
  }, [order]);

  // Load delivery for rating when modal is open (must be before any conditional return)
  useEffect(() => {
    if (!showRatingModal || !order || order.clientId !== authUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const estimations = await getEstimationsByOrderIdApi(order.id);
        if (cancelled) return;
        const clientConfirmed = estimations.find(
          (e) => e.userRole === "client" && e.status === "confirmed" && e.acceptedBy
        );
        if (clientConfirmed?.acceptedBy) {
          const res = await getProfileById(clientConfirmed.acceptedBy);
          if (cancelled) return;
          const user = res?.data?.user;
          if (user) {
            setDeliveryForRating({
              userId: user.id,
              name: user.name ?? "Delivery",
              photo: user.photo ? buildPhotoUrl(user.photo) : null,
            });
          }
        }
      } catch {
        // Delivery section will stay hidden; modal still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showRatingModal, order?.id, authUserId]);

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
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusBadge = STATUS_BADGE[order.status];
  const orderCode = `MC-${order.id.slice(-4).toUpperCase()}`;
  const firstItem = order.items[0];
  const firstTitle = firstItem ? productById[firstItem.productId]?.title ?? `Product ${firstItem.productId.slice(-6)}` : "Order";
  const showPaymentButton = order.status === "accepted" && order.clientId === authUserId;
  const isPatissiereIncomingOrder = authRole === "patissiere" && order.patissiereId === authUserId;
  const showAcceptButton = isPatissiereIncomingOrder && order.status === "pending";
  const showCompleteButton = isPatissiereIncomingOrder && order.status === "preparing";
  const isClientOrderCompleted = order.clientId === authUserId && order.status === "completed";
  const showDeliveredByClientButton = isClientOrderCompleted;
  const showStartDeliveryButton = isClientOrderCompleted;
  const showRatingButton =
    order.status === "delivered" && order.clientId === authUserId;

  const handleOpenRatingModal = () => {
    if (!order) return;
    setDeliveryForRating(null);
    setShowRatingModal(true);
  };

  const handleAcceptOrder = async () => {
    if (!order || accepting) return;
    try {
      setAccepting(true);
      setActionError(null);
      const updated = await acceptOrderApi(order.id);
      if (updated) {
        setOrder(updated);
      } else {
        await loadOrder();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to accept order";
      setActionError(msg);
    } finally {
      setAccepting(false);
    }
  };

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
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
          </View>
        </View>

        {(order.status === "completed" || order.status === "delivering" || order.status === "delivered") && order.clientId === authUserId ? (
          <OrderEstimationSection
            orderId={order.id}
            refetchTrigger={estimationsRefresh}
            isClient={true}
            orderTotal={breakdown.total}
            orderStatus={order.status}
          />
        ) : null}

        <View style={styles.deliveryCard}>
          <View style={styles.deliveryIcon}>
            <MaterialIcons name="delivery-dining" size={30} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deliveryMeta}>Estimated Delivery</Text>
            <Text style={styles.deliveryRange}>{formatDeliveryWindow(order.requestedDateTime)}</Text>
          </View>
        </View>

        {otherParty ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {authRole === "patissiere" ? "Client" : "Patissiere"}
            </Text>
            <Pressable
              style={styles.otherPartyCard}
              onPress={() => router.push(getProfilePath(otherParty.id) as any)}
            >
              {buildPhotoUrl(otherParty.photo) ? (
                <Image
                  source={{ uri: buildPhotoUrl(otherParty.photo)! }}
                  style={styles.otherPartyAvatar}
                />
              ) : (
                <View style={[styles.otherPartyAvatar, styles.otherPartyAvatarPlaceholder]}>
                  <MaterialIcons name="person" size={28} color={PRIMARY} />
                </View>
              )}
              <View style={styles.otherPartyInfo}>
                <Text style={styles.otherPartyName}>{otherParty.name}</Text>
                {otherParty.city ? (
                  <Text style={styles.otherPartyMeta}>{otherParty.city}</Text>
                ) : null}
              </View>
              <MaterialIcons name="chevron-right" size={24} color={SLATE_400} />
            </Pressable>
          </View>
        ) : null}

        {isPatissiereIncomingOrder ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Request</Text>
            <View style={styles.requestCard}>
              <View style={styles.requestRow}>
                <MaterialIcons name="schedule" size={16} color={PRIMARY} />
                <Text style={styles.requestText}>{formatDateTime(order.requestedDateTime)}</Text>
              </View>
              <View style={styles.requestRow}>
                <MaterialIcons name="place" size={16} color={PRIMARY} />
                <Text style={styles.requestText} numberOfLines={2}>
                  {order.deliveryAddress}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <View style={styles.timelineWrap}>
            {STEPS.map((step, index) => {
              const isDeliveredStep = step.key === "delivered";
              const completed =
                index < currentStepIndex ||
                (order.status === "delivered" && isDeliveredStep);
              const active = index === currentStepIndex && order.status !== "delivered";
              const isFuture = index > currentStepIndex && !(order.status === "delivered" && isDeliveredStep);
              return (
                <View style={styles.stepRow} key={step.key}>
                  <View style={styles.stepVisual}>
                    <View
                      style={[
                        styles.stepDot,
                        completed && styles.stepDotDone,
                        active && styles.stepDotActive,
                        isFuture && styles.stepDotFuture,
                      ]}
                    >
                      {completed ? (
                        <MaterialIcons name="check" size={12} color="#fff" />
                      ) : active ? (
                        <View style={styles.activeInnerDot} />
                      ) : (
                        <MaterialIcons name={step.icon} size={12} color={SLATE_400} />
                      )}
                    </View>
                    {index < STEPS.length - 1 ? (
                      <View style={[styles.stepLine, (completed || active) && styles.stepLineDone]} />
                    ) : null}
                  </View>
                  <View style={styles.stepTextWrap}>
                    <Text style={[styles.stepLabel, active && styles.stepLabelActive, isFuture && styles.stepLabelFuture]}>
                      {step.label}
                    </Text>
                    <Text style={[styles.stepTime, isFuture && styles.stepTimeFuture]}>
                      {active
                        ? `${formatTimelineTime(order.createdAt)} - In progress`
                        : completed
                        ? formatTimelineTime(order.createdAt)
                        : "Expected soon"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Your Items</Text>
            <Text style={styles.itemsCount}>{order.items.length} Items</Text>
          </View>
          <View style={styles.itemsList}>
            {order.items.map((item, idx) => (
              <OrderItemCard
                key={`${item.id}-${idx}`}
                item={item}
                product={productById[item.productId]}
                fallbackTitle={idx === 0 ? firstTitle : `Product ${item.productId.slice(-6)}`}
                showProductDescription={isPatissiereIncomingOrder}
              />
            ))}
          </View>
        </View>

        <View style={styles.totalCard}>
          <PriceRow label="Subtotal" value={breakdown.subtotal} />
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={styles.priceValue}>0.00 EUR</Text>
          </View>
          <View style={styles.totalDivider} />
          <PriceRow label="Total" value={breakdown.total} primary strong />
        </View>

        <View style={styles.actions}>
          {showAcceptButton ? (
            <Pressable style={styles.acceptAction} onPress={handleAcceptOrder} disabled={accepting}>
              <MaterialIcons name="check-circle" size={18} color="#fff" />
              <Text style={styles.acceptActionText}>{accepting ? "Accepting..." : "Accept Order"}</Text>
            </Pressable>
          ) : null}
          {showCompleteButton ? (
            <Pressable
              style={styles.acceptAction}
              onPress={async () => {
                if (!order || accepting) return;
                try {
                  setAccepting(true);
                  setActionError(null);
                  const updated = await completeOrderApi(order.id);
                  if (updated) {
                    setOrder(updated);
                  } else {
                    await loadOrder();
                  }
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Failed to complete order";
                  setActionError(msg);
                } finally {
                  setAccepting(false);
                }
              }}
              disabled={accepting}
            >
              <MaterialIcons name="task-alt" size={18} color="#fff" />
              <Text style={styles.acceptActionText}>{accepting ? "Completing..." : "Mark as Completed"}</Text>
            </Pressable>
          ) : null}
          {showPaymentButton ? (
            <Pressable
              style={styles.paymentAction}
              onPress={() =>
                router.push({
                  pathname: "/(main)/payment",
                  params: {
                    orderId: order.id,
                    total: String(Number(breakdown.total.toFixed(2))),
                  },
                })
              }
            >
              <MaterialIcons name="payments" size={18} color="#fff" />
              <Text style={styles.paymentActionText}>Pay Now</Text>
            </Pressable>
          ) : null}
          {(showDeliveredByClientButton || showStartDeliveryButton) ? (
            <View style={styles.twoButtonsRow}>
              <Pressable
                style={styles.deliveredByClientAction}
                onPress={async () => {
                  if (!order || accepting) return;
                  try {
                    setAccepting(true);
                    setActionError(null);
                    const updated = await markDeliveredByClientApi(order.id);
                    if (updated) setOrder(updated);
                    else await loadOrder();
                  } catch (e: unknown) {
                    setActionError(e instanceof Error ? e.message : "Failed to update");
                  } finally {
                    setAccepting(false);
                  }
                }}
                disabled={accepting}
              >
                <MaterialIcons name="check-circle" size={18} color="#fff" />
                <Text style={styles.twoBtnText} numberOfLines={1}>
                  {accepting ? "Updating..." : "Make delivered"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.startDeliveryAction}
                onPress={() => {
                  if (!order) return;
                  dispatch(openEstimationPanel(order.id));
                }}
                disabled={accepting}
              >
                <MaterialIcons name="local-shipping" size={18} color="#fff" />
                <Text style={styles.twoBtnText} numberOfLines={1}>
                  Launch delivery
                </Text>
              </Pressable>
            </View>
          ) : null}
          {showRatingButton ? (
            <Pressable
              style={styles.ratingAction}
              onPress={handleOpenRatingModal}
            >
              <MaterialIcons name="star" size={18} color="#fff" />
              <Text style={styles.ratingActionText}>Rate order</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.primaryAction}>
            <MaterialIcons name="chat-bubble-outline" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>
              {authRole === "patissiere" ? "Contact Client" : "Contact Patissiere"}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryAction}>
            <MaterialIcons name="receipt-long" size={18} color={SLATE_600} />
            <Text style={styles.secondaryActionText}>Download Invoice</Text>
          </Pressable>
          {actionError ? <Text style={styles.actionErrorText}>{actionError}</Text> : null}
        </View>
      </ScrollView>
      <EstimationCreateModal
        visible={estimationPanelOrderId === order.id}
        orderId={order.id}
        onClose={() => dispatch(closeEstimationPanel())}
        onSuccess={() => {
          setEstimationsRefresh((k) => k + 1);
          loadOrder();
        }}
      />
      <OrderRatingModal
        visible={showRatingModal}
        order={order}
        productById={productById}
        patissiereId={order.patissiereId}
        patissiereName={otherParty?.name}
        patissierePhoto={otherParty?.photo ? buildPhotoUrl(otherParty.photo) : null}
        clientId={authUserId}
        delivery={deliveryForRating}
        onClose={() => {
          setShowRatingModal(false);
          setDeliveryForRating(null);
        }}
        onSuccess={() => {
          setShowRatingModal(false);
          setDeliveryForRating(null);
        }}
      />
    </SafeAreaView>
  );
}

function OrderItemCard({
  item,
  product,
  fallbackTitle,
  showProductDescription = false,
}: {
  item: ClientOrderItem;
  product?: ProductPreview;
  fallbackTitle: string;
  showProductDescription?: boolean;
}) {
  const itemTotal = item.price * item.quantity;
  const imageUri = product?.imageUri ?? FALLBACK_IMAGE;
  const title = product?.title || fallbackTitle;
  const colors = item.customizationDetails?.colors;
  const garniture = item.customizationDetails?.garniture;
  const message = item.customizationDetails?.message;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        <Image source={{ uri: imageUri }} style={styles.itemImage} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.itemPrice}>{itemTotal.toFixed(2)} EUR</Text>
          </View>
          <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
          {showProductDescription && product?.description ? (
            <Text style={styles.itemDescription} numberOfLines={3}>
              {product.description}
            </Text>
          ) : null}
          {colors ? <TagLine tag="Flavors" value={colors} /> : null}
          {garniture ? <TagLine tag="Garniture" value={garniture} /> : null}
          {message ? <TagLine tag="Message" value={message} accent italic /> : null}
        </View>
      </View>
    </View>
  );
}

function TagLine({
  tag,
  value,
  accent = false,
  italic = false,
}: {
  tag: string;
  value: string;
  accent?: boolean;
  italic?: boolean;
}) {
  return (
    <View style={styles.tagLine}>
      <View style={[styles.tagChip, accent && styles.tagChipAccent]}>
        <Text style={[styles.tagChipText, accent && styles.tagChipTextAccent]}>{tag}</Text>
      </View>
      <Text style={[styles.tagValue, italic && styles.tagValueItalic]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
  primary = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
  primary?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, strong && styles.priceStrong]}>{label}</Text>
      <Text style={[styles.priceValue, strong && styles.priceStrong, primary && styles.pricePrimary]}>
        {value.toFixed(2)} EUR
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingHorizontal: 24 },
  secondaryText: { fontSize: 13, color: SLATE_500, fontWeight: "600" },
  errorText: { fontSize: 13, color: "#b91c1c", fontWeight: "600", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 8 },
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
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  statusBadgeText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  deliveryCard: {
    marginTop: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deliveryIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: `${PRIMARY}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryMeta: { fontSize: 10, color: SLATE_500, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  deliveryRange: { marginTop: 2, fontSize: 14, color: TEXT_PRIMARY, fontWeight: "800" },
  section: { marginTop: 20 },
  otherPartyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
  },
  otherPartyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SLATE_200,
  },
  otherPartyAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  otherPartyInfo: { flex: 1 },
  otherPartyName: { fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY },
  otherPartyMeta: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  requestCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
    gap: 10,
  },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  requestText: { flex: 1, fontSize: 12, color: TEXT_PRIMARY, fontWeight: "600" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: TEXT_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  itemsCount: { fontSize: 11, color: SLATE_500, fontWeight: "600", marginBottom: 10 },
  timelineWrap: { gap: 0 },
  stepRow: { flexDirection: "row", gap: 12 },
  stepVisual: { alignItems: "center" },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  stepDotDone: { backgroundColor: PRIMARY },
  stepDotActive: { backgroundColor: SURFACE, borderWidth: 2, borderColor: PRIMARY },
  stepDotFuture: { backgroundColor: "#f1f5f9" },
  activeInnerDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: PRIMARY },
  stepLine: { width: 2, height: 38, backgroundColor: "#e2e8f0" },
  stepLineDone: { backgroundColor: PRIMARY },
  stepTextWrap: { flex: 1, paddingTop: 2, paddingBottom: 12 },
  stepLabel: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: "800" },
  stepLabelActive: { color: PRIMARY },
  stepLabelFuture: { color: SLATE_400, fontWeight: "600" },
  stepTime: { fontSize: 11, color: SLATE_500, marginTop: 2, fontWeight: "500" },
  stepTimeFuture: { color: SLATE_400 },
  itemsList: { gap: 10 },
  itemCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 12,
  },
  itemRow: { flexDirection: "row", gap: 10 },
  itemImage: { width: 74, height: 74, borderRadius: 10, backgroundColor: BORDER_SUBTLE },
  itemTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: TEXT_PRIMARY },
  itemPrice: { fontSize: 13, fontWeight: "900", color: PRIMARY },
  itemQty: { marginTop: 4, fontSize: 11, color: SLATE_500, fontWeight: "600" },
  itemDescription: { marginTop: 5, fontSize: 11, color: SLATE_600, lineHeight: 16 },
  tagLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  tagChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagChipAccent: { backgroundColor: "#fdf2f8" },
  tagChipText: { fontSize: 9, color: SLATE_600, fontWeight: "700" },
  tagChipTextAccent: { color: PRIMARY },
  tagValue: { flex: 1, fontSize: 11, color: SLATE_500, fontWeight: "500" },
  tagValueItalic: { fontStyle: "italic" },
  totalCard: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    paddingTop: 14,
    gap: 9,
  },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceLabel: { fontSize: 13, color: SLATE_500, fontWeight: "500" },
  priceValue: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: "600" },
  totalDivider: { borderTopWidth: 1, borderTopColor: SLATE_200, borderStyle: "dashed", marginTop: 2, paddingTop: 2 },
  priceStrong: { fontSize: 16, fontWeight: "900", color: TEXT_PRIMARY },
  pricePrimary: { color: PRIMARY },
  actions: { marginTop: 22, gap: 10 },
  acceptAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  acceptActionText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  paymentAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  paymentActionText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  twoButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  deliveredByClientAction: {
    flex: 1,
    minWidth: 0,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  startDeliveryAction: {
    flex: 1,
    minWidth: 0,
    height: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
  },
  twoBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  ratingAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ratingActionText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  primaryAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  secondaryAction: {
    height: 50,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SLATE_200,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionText: { color: SLATE_600, fontSize: 14, fontWeight: "800" },
  actionErrorText: { color: "#b91c1c", fontSize: 12, fontWeight: "600", textAlign: "center" },
});
