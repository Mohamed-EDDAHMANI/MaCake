import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SURFACE,
  BORDER,
  BORDER_SUBTLE,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  TEXT_PRIMARY,
  FLOATING_TAB_BAR_BOTTOM_SAFE,
} from "@/constants/colors";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  clearCart as clearCartAction,
  updateQuantity,
} from "@/store/features/cart/cartSlice";
import SuccessLottie from "@/components/common/success-lottie";
import DateTimePickerSheet from "@/components/common/date-time-picker-sheet";

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeForInput(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDateDisplay(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    weekday: "short",
  });
}

export default function ClientCartScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const items = useAppSelector((s) => s.cart.items);
  const user = useAppSelector((s) => s.auth.user);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressSource, setDeliveryAddressSource] = useState<
    "profile" | "current_location" | ""
  >("");
  const [isLocating, setIsLocating] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState(() =>
    formatDateForInput(new Date())
  );
  const [requestedTime, setRequestedTime] = useState(() =>
    formatTimeForInput(new Date())
  );
  const [isDateTimeSheetOpen, setIsDateTimeSheetOpen] = useState(false);

  const totals = useMemo(() => {
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return { total };
  }, [items]);

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  const profileAddress = useMemo(() => {
    const parts = [user?.address, user?.city].filter(Boolean);
    return parts.join(", ");
  }, [user?.address, user?.city]);

  useEffect(() => {
    if (!profileAddress) return;
    if (deliveryAddressSource === "current_location") return;

    if (!deliveryAddress || deliveryAddressSource === "profile" || deliveryAddressSource === "") {
      setDeliveryAddress(profileAddress);
      setDeliveryAddressSource("profile");
      setAddressError(null);
    }
  }, [profileAddress, deliveryAddress, deliveryAddressSource]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const openCheckout = () => {
    if (items.length === 0) return;
    router.push("/(main)/checkout");
  };

  const showOrderSuccess = () => {
    dispatch(clearCartAction());
    setIsCheckoutOpen(false);
    setShowSuccess(true);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setShowSuccess(false);
      successTimeoutRef.current = null;
    }, 1600);
  };

  const useProfileAddress = () => {
    if (!profileAddress) {
      setAddressError("Please add your address in profile first.");
      return;
    }
    setDeliveryAddress(profileAddress);
    setDeliveryAddressSource("profile");
    setAddressError(null);
    setIsAddressPickerOpen(false);
  };

  const useCurrentLocation = async () => {
    try {
      setIsLocating(true);
      setAddressError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAddressError("Location permission denied.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const first = places[0];
      const addressFromGps = [
        first?.name,
        first?.street,
        first?.city,
        first?.region,
      ]
        .filter(Boolean)
        .join(", ");

      setDeliveryAddress(addressFromGps || "Current phone location");
      setDeliveryAddressSource("current_location");
      setIsAddressPickerOpen(false);
    } catch {
      setAddressError("Unable to fetch current location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!deliveryAddress.trim()) {
      setAddressError("Please choose a delivery address.");
      return;
    }
    setAddressError(null);
    showOrderSuccess();
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <View style={styles.headerIconGhost} />
          </View>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <View style={styles.headerSide}>
            {items.length > 0 ? (
              <Pressable
                style={styles.iconBtn}
                hitSlop={10}
                onPress={clearCart}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color={SLATE_600}
                />
              </Pressable>
            ) : (
              <View style={styles.headerIconGhost} />
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cart items */}
          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons
                name="shopping-cart"
                size={40}
                color={SLATE_400}
              />
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptyText}>
                Add a masterpiece cake to begin your order.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.imageWrap}>
                      {item.imageUri ? (
                        <Image
                          source={{ uri: item.imageUri[0] }}
                          style={styles.image}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.image, { backgroundColor: BORDER_SUBTLE }]} />
                      )}
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemHeaderRow}>
                        <Text
                          style={styles.itemTitle}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.itemPrice}>
                          {item.price.toFixed(0)} MAD
                        </Text>
                      </View>
                      <View style={styles.itemMeta}>
                        <Text style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Colors: </Text>
                          <Text style={styles.metaValue}>
                            {item.colors ?? "—"}
                          </Text>
                        </Text>
                        <Text style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Garniture: </Text>
                          <Text style={styles.metaValue}>
                            {item.garnish ?? "—"}
                          </Text>
                        </Text>
                        <View style={styles.metaRowBlock}>
                          <Text style={styles.metaLabel}>Message:</Text>
                          <Text style={styles.metaValueMessage}>
                            {item.message ?? "—"}
                          </Text>
                        </View>
                        <Text style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Line total: </Text>
                          <Text style={styles.metaValue}>
                            {(item.price * item.quantity).toFixed(0)} MAD
                          </Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <Pressable style={styles.editBtn}>
                      <MaterialIcons
                        name="edit"
                        size={18}
                        color={PRIMARY}
                      />
                      <Text style={styles.editText}>Edit Customization</Text>
                    </Pressable>
                    <View style={styles.qtyWrap}>
                      <Pressable
                        onPress={() =>
                          dispatch(updateQuantity({ id: item.id, delta: -1 }))
                        }
                        style={styles.qtyBtn}
                        hitSlop={10}
                      >
                        <MaterialIcons
                          name="remove"
                          size={18}
                          color={SLATE_600}
                        />
                      </Pressable>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <Pressable
                        onPress={() =>
                          dispatch(updateQuantity({ id: item.id, delta: +1 }))
                        }
                        style={[styles.qtyBtn, styles.qtyBtnPrimary]}
                        hitSlop={10}
                      >
                        <MaterialIcons
                          name="add"
                          size={18}
                          color="#fff"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Order summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                <Text style={styles.summaryTotalValue}>
                  {totals.total.toFixed(0)} MAD
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Checkout button */}
        <View style={styles.checkoutBar}>
          <Pressable
            style={[styles.checkoutBtn, items.length === 0 && styles.checkoutBtnDisabled]}
            onPress={openCheckout}
            disabled={items.length === 0}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>

        {isCheckoutOpen && (
          <View style={styles.checkoutOverlay}>
            <View style={styles.checkoutModal}>
              <View style={styles.checkoutHeader}>
                <Pressable onPress={() => setIsCheckoutOpen(false)} hitSlop={10}>
                  <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
                </Pressable>
                <Text style={styles.checkoutHeaderTitle}>Checkout</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView contentContainerStyle={styles.checkoutBody}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                  <Pressable onPress={() => setIsAddressPickerOpen(true)}>
                    <Text style={styles.editAction}>Edit</Text>
                  </Pressable>
                </View>

                <View style={styles.addressCard}>
                  <View style={styles.addressIconWrap}>
                    <MaterialIcons name="location-on" size={22} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>
                      {deliveryAddressSource === "current_location"
                        ? "Current Location"
                        : "Profile Address"}
                    </Text>
                    <Text style={styles.addressValue}>
                      {deliveryAddress || "Select address before placing order."}
                    </Text>
                  </View>
                </View>
                {addressError ? <Text style={styles.addressError}>{addressError}</Text> : null}

                <Text style={styles.sectionTitle}>Requested Delivery</Text>
                <View style={styles.deliveryGrid}>
                  <Pressable style={styles.deliveryInput} onPress={() => setIsDateTimeSheetOpen(true)}>
                    <Text style={styles.deliveryInputLabel}>Date</Text>
                    <Text style={styles.deliveryInputValue}>{formatDateDisplay(requestedDate)}</Text>
                  </Pressable>
                  <Pressable style={styles.deliveryInput} onPress={() => setIsDateTimeSheetOpen(true)}>
                    <Text style={styles.deliveryInputLabel}>Time</Text>
                    <Text style={styles.deliveryInputValue}>{requestedTime}</Text>
                  </Pressable>
                </View>

                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.checkoutSummaryCard}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.checkoutItemRow}>
                      <Text style={styles.checkoutItemTitle} numberOfLines={1}>
                        {item.title} x{item.quantity}
                      </Text>
                      <Text style={styles.checkoutItemPrice}>
                        {(item.price * item.quantity).toFixed(0)} MAD
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Payment Method</Text>
                <View style={styles.walletCard}>
                  <MaterialIcons name="account-balance-wallet" size={20} color={PRIMARY} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.walletTitle}>Application Wallet</Text>
                    <Text style={styles.walletSub}>
                      Balance: {(user?.walletBalance ?? 0).toFixed(2)} MAD
                    </Text>
                  </View>
                  <View style={styles.walletRadioOuter}>
                    <View style={styles.walletRadioInner} />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.checkoutFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabelFooter}>Total</Text>
                  <Text style={styles.totalValueFooter}>{totals.total.toFixed(0)} MAD</Text>
                </View>
                <Pressable style={styles.placeOrderBtn} onPress={handlePlaceOrder}>
                  <Text style={styles.placeOrderText}>Place Order</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {isAddressPickerOpen && (
          <View style={styles.addressPickerOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsAddressPickerOpen(false)}
            />
            <View style={styles.addressPickerCard}>
              <Text style={styles.addressPickerTitle}>Choose Delivery Address</Text>

              <Pressable style={styles.addressOptionBtn} onPress={useProfileAddress}>
                <MaterialIcons name="person-pin-circle" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressOptionTitle}>Use your profile address</Text>
                  <Text style={styles.addressOptionSub} numberOfLines={2}>
                    {profileAddress || "No profile address found."}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.addressOptionBtn}
                onPress={useCurrentLocation}
                disabled={isLocating}
              >
                <MaterialIcons name="my-location" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressOptionTitle}>
                    {isLocating ? "Getting current location..." : "Use phone current location"}
                  </Text>
                  <Text style={styles.addressOptionSub}>
                    GPS location will be used as delivery address.
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        <DateTimePickerSheet
          visible={isDateTimeSheetOpen}
          selectedDate={requestedDate}
          selectedTime={requestedTime}
          onClose={() => setIsDateTimeSheetOpen(false)}
          onConfirm={(date, time) => {
            setRequestedDate(date);
            setRequestedTime(time);
          }}
        />

        {showSuccess && (
          <View style={styles.successOverlay} pointerEvents="none">
            <SuccessLottie />
            <View style={styles.successMessageCard}>
              <View style={styles.successIconWrap}>
                <MaterialIcons name="check" size={14} color="#fff" />
              </View>
              <Text style={styles.successText}>Order created successfully</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND_LIGHT,
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
    backgroundColor: BACKGROUND_LIGHT,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  headerSide: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconGhost: {
    width: 32,
    height: 32,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },
  itemsList: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
  },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: BORDER_SUBTLE,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
  },
  itemMeta: {
    marginTop: 2,
  },
  metaRow: {
    fontSize: 12,
    color: SLATE_500,
    marginTop: 2,
  },
  metaRowBlock: {
    marginTop: 2,
  },
  metaLabel: {
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  metaValue: {
    color: SLATE_600,
  },
  metaValueMessage: {
    marginTop: 2,
    color: SLATE_600,
    fontSize: 12,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    marginTop: 10,
    paddingTop: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BORDER_SUBTLE,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },
  qtyBtnPrimary: {
    backgroundColor: PRIMARY,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  summarySection: {
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: SLATE_600,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BORDER_SUBTLE,
    marginVertical: 8,
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY,
  },
  checkoutBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: FLOATING_TAB_BAR_BOTTOM_SAFE - 24,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: "transparent",
    borderTopWidth: 0,
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  emptyWrap: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  emptyText: {
    fontSize: 14,
    color: SLATE_500,
    textAlign: "center",
    maxWidth: 260,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  successMessageCard: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.95)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 22,
      },
      android: {
        elevation: 7,
      },
    }),
  },
  successIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  successText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: "#0f172a",
  },
  checkoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    zIndex: 90,
  },
  checkoutModal: {
    flex: 1,
    marginTop: 40,
    backgroundColor: BACKGROUND_LIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  checkoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
  },
  checkoutHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  checkoutBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    paddingBottom: 160,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  editAction: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 13,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 14,
    padding: 12,
  },
  addressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${PRIMARY}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  addressValue: {
    marginTop: 2,
    fontSize: 13,
    color: SLATE_600,
  },
  addressError: {
    marginTop: -4,
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "600",
  },
  deliveryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  deliveryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 12,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deliveryInputLabel: {
    fontSize: 12,
    color: SLATE_500,
    marginBottom: 3,
  },
  deliveryInputValue: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  checkoutSummaryCard: {
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 14,
    backgroundColor: SURFACE,
    padding: 12,
    gap: 8,
  },
  checkoutItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  checkoutItemTitle: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  checkoutItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 14,
    backgroundColor: `${PRIMARY}0D`,
    padding: 12,
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  walletSub: {
    marginTop: 2,
    fontSize: 12,
    color: SLATE_500,
  },
  walletRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  walletRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  checkoutFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
    backgroundColor: SURFACE,
    gap: 10,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabelFooter: {
    fontSize: 15,
    color: SLATE_600,
    fontWeight: "600",
  },
  totalValueFooter: {
    fontSize: 20,
    color: PRIMARY,
    fontWeight: "800",
  },
  placeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 13,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  addressPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 95,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  addressPickerCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 14,
    gap: 10,
  },
  addressPickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  addressOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BACKGROUND_LIGHT,
  },
  addressOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  addressOptionSub: {
    marginTop: 2,
    fontSize: 12,
    color: SLATE_500,
  },
});

