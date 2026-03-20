import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  BACKGROUND_LIGHT,
  BORDER,
  BORDER_SUBTLE,
  PRIMARY,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SURFACE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCart as clearCartAction } from "@/store/features/cart/cartSlice";
import OrderSuccessPopup from "@/components/product-detail/OrderSuccessPopup";
import { createOrderApi } from "@/store/features/order/orderApi";
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

export default function CheckoutScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const user = useAppSelector((s) => s.auth.user);

  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressSource, setDeliveryAddressSource] = useState<
    "profile" | "current_location" | ""
  >("");
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null);
  const [requestedDate, setRequestedDate] = useState(() => formatDateForInput(new Date()));
  const [requestedTime, setRequestedTime] = useState(() => formatTimeForInput(new Date()));
  const [isDateTimeSheetOpen, setIsDateTimeSheetOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"wallet" | "card">(
    "wallet"
  );
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = items.length > 0 ? 0 : 0;
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  }, [items]);

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
      setDeliveryLatitude(user?.latitude ?? null);
      setDeliveryLongitude(user?.longitude ?? null);
      setAddressError(null);
    }
  }, [profileAddress, deliveryAddress, deliveryAddressSource, user?.latitude, user?.longitude]);

  const useProfileAddress = () => {
    if (!profileAddress) {
      setAddressError("Please add your address in profile first.");
      return;
    }
    setDeliveryAddress(profileAddress);
    setDeliveryAddressSource("profile");
    setDeliveryLatitude(user?.latitude ?? null);
    setDeliveryLongitude(user?.longitude ?? null);
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
      const value = [first?.name, first?.street, first?.city, first?.region]
        .filter(Boolean)
        .join(", ");
      setDeliveryAddress(value || "Current phone location");
      setDeliveryAddressSource("current_location");
      setDeliveryLatitude(pos.coords.latitude);
      setDeliveryLongitude(pos.coords.longitude);
      setIsAddressPickerOpen(false);
    } catch {
      setAddressError("Unable to get current location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      setAddressError("Please choose your delivery address.");
      return;
    }
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate.trim());
    const timeOk = /^\d{2}:\d{2}$/.test(requestedTime.trim());
    if (!dateOk || !timeOk) {
      setAddressError("Please enter a valid date and time.");
      return;
    }
    if (!deliveryAddressSource) {
      setAddressError("Please choose address source.");
      return;
    }
    if (!user?.id) {
      setOrderError("Please login before placing an order.");
      return;
    }
    if (selectedPaymentMethod === "card") {
      const isCardValid =
        cardNumber.replace(/\s/g, "").length >= 12 &&
        cardHolder.trim().length >= 3 &&
        cardExpiry.trim().length === 5 &&
        cardCvv.trim().length >= 3;
      if (!isCardValid) {
        setPaymentError("Please complete card information.");
        return;
      }
    }
    setPaymentError(null);
    setOrderError(null);
    setIsPlacingOrder(true);

    try {
      const patissiereIds = Array.from(
        new Set(items.map((item) => item.patissiereId).filter(Boolean))
      ) as string[];
      if (patissiereIds.length !== 1) {
        setOrderError("All cart items must belong to one patissiere.");
        return;
      }
      const patissiereId = patissiereIds[0];
      const patissiereItem = items.find((item) => item.patissiereId === patissiereId);
      const patissiereAddress = patissiereItem?.patissiereAddress || "Patissiere address unavailable";
      const patissiereLatitude = patissiereItem?.patissiereLatitude ?? undefined;
      const patissiereLongitude = patissiereItem?.patissiereLongitude ?? undefined;

      await createOrderApi({
        clientId: user.id,
        patissiereId,
        patissiereAddress,
        totalPrice: totals.total,
        deliveryAddress,
        deliveryAddressSource,
        deliveryLatitude: deliveryLatitude ?? undefined,
        deliveryLongitude: deliveryLongitude ?? undefined,
        patissiereLatitude,
        patissiereLongitude,
        requestedDateTime: `${requestedDate}T${requestedTime}:00`,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: item.price,
          customizationDetails: {
            colors: item.colors,
            garniture: item.garnish,
            message: item.message,
          },
        })),
      });

      dispatch(clearCartAction());
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.replace("/(main)/(tabs)/orders");
      }, 1400);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create order. Please try again.";
      setOrderError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const onCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const chunks = digits.match(/.{1,4}/g) ?? [];
    setCardNumber(chunks.join(" "));
  };

  const onCardExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setCardExpiry(digits);
      return;
    }
    setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
  };

  const maskedCardNumber = useMemo(() => {
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 4) return "";
    return `**** **** **** ${digits.slice(-4)}`;
  }, [cardNumber]);

  if (items.length === 0 && !showSuccess) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.emptyWrap}>
          <MaterialIcons name="shopping-bag" size={42} color={SLATE_400} />
          <Text style={styles.emptyTitle}>No items for checkout</Text>
          <Pressable style={styles.backToCartBtn} onPress={() => router.back()}>
            <Text style={styles.backToCartText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <Pressable onPress={() => setIsAddressPickerOpen(true)}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.addressCard}>
              <View style={styles.addressIconWrap}>
                <MaterialIcons name="location-on" size={22} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressTitle}>
                  {deliveryAddressSource === "current_location"
                    ? "Current Location"
                    : "Home (Default)"}
                </Text>
                <Text style={styles.addressText}>
                  {deliveryAddress || profileAddress || "Please select an address"}
                </Text>
              </View>
            </View>
            {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Requested Delivery</Text>
            <View style={styles.deliveryGrid}>
              <Pressable style={styles.deliveryInput} onPress={() => setIsDateTimeSheetOpen(true)}>
                <Text style={styles.deliveryLabel}>Date</Text>
                <Text style={styles.deliveryTextInput}>{formatDateDisplay(requestedDate)}</Text>
              </Pressable>
              <Pressable style={styles.deliveryInput} onPress={() => setIsDateTimeSheetOpen(true)}>
                <Text style={styles.deliveryLabel}>Time</Text>
                <Text style={styles.deliveryTextInput}>{requestedTime}</Text>
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              {items.map((item) => (
                <View key={item.id} style={styles.summaryRow}>
                  <View style={styles.summaryImageWrap}>
                    {item.imageUri ? (
                      <Image source={{ uri: item.imageUri }} style={styles.summaryImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.summaryImage, { backgroundColor: BORDER_SUBTLE }]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.summaryMeta}>Quantity: {item.quantity}</Text>
                  </View>
                  <Text style={styles.summaryPrice}>
                    {(item.price * item.quantity).toFixed(0)} MAD
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethodsWrap}>
              <Pressable
                style={[
                  styles.walletCard,
                  selectedPaymentMethod !== "wallet" && styles.paymentOptionInactive,
                ]}
                onPress={() => {
                  setSelectedPaymentMethod("wallet");
                  setPaymentError(null);
                }}
              >
                <MaterialIcons name="account-balance-wallet" size={22} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletTitle}>Application Wallet</Text>
                  <Text style={styles.walletSub}>
                    Balance: {(user?.walletBalance ?? 0).toFixed(2)} MAD
                  </Text>
                </View>
                <View style={styles.radioOuter}>
                  {selectedPaymentMethod === "wallet" ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>

              <Pressable
                style={[
                  styles.walletCard,
                  selectedPaymentMethod !== "card" && styles.paymentOptionInactive,
                ]}
                onPress={() => {
                  setSelectedPaymentMethod("card");
                  setPaymentError(null);
                }}
              >
                <MaterialIcons name="credit-card" size={22} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletTitle}>Card</Text>
                  <Text style={styles.walletSub}>
                    {maskedCardNumber || "Add your card info"}
                  </Text>
                </View>
                <View style={styles.radioOuter}>
                  {selectedPaymentMethod === "card" ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>

              {selectedPaymentMethod === "card" && (
                <View style={styles.cardForm}>
                  <TextInput
                    value={cardNumber}
                    onChangeText={onCardNumberChange}
                    placeholder="Card number"
                    placeholderTextColor={SLATE_400}
                    keyboardType="number-pad"
                    style={styles.cardInput}
                  />
                  <TextInput
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    placeholder="Card holder name"
                    placeholderTextColor={SLATE_400}
                    style={styles.cardInput}
                  />
                  <View style={styles.cardRow}>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={onCardExpiryChange}
                      placeholder="MM/YY"
                      placeholderTextColor={SLATE_400}
                      keyboardType="number-pad"
                      style={[styles.cardInput, styles.cardInputHalf]}
                    />
                    <TextInput
                      value={cardCvv}
                      onChangeText={(value) => setCardCvv(value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="CVV"
                      placeholderTextColor={SLATE_400}
                      keyboardType="number-pad"
                      secureTextEntry
                      style={[styles.cardInput, styles.cardInputHalf]}
                    />
                  </View>
                </View>
              )}
              {paymentError ? <Text style={styles.errorText}>{paymentError}</Text> : null}
              {orderError ? <Text style={styles.errorText}>{orderError}</Text> : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalLabel}>{totals.subtotal.toFixed(0)} MAD</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Delivery Fee</Text>
            <Text style={styles.totalLabel}>{totals.deliveryFee.toFixed(0)} MAD</Text>
          </View>
          <View style={styles.totalMain}>
            <Text style={styles.totalMainLabel}>Total</Text>
            <Text style={styles.totalMainValue}>{totals.total.toFixed(0)} MAD</Text>
          </View>
          <Pressable
            style={[styles.placeBtn, isPlacingOrder && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={isPlacingOrder}
          >
            <Text style={styles.placeBtnText}>
              {isPlacingOrder ? "Placing..." : "Place Order"}
            </Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>

        {isAddressPickerOpen && (
          <View style={styles.addressPopupOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsAddressPickerOpen(false)}
            />
            <View style={styles.addressPopupCard}>
              <Text style={styles.addressPopupTitle}>Choose delivery address</Text>
              <Pressable style={styles.addressOption} onPress={useProfileAddress}>
                <MaterialIcons name="person-pin-circle" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Use your profile address</Text>
                  <Text style={styles.optionSub} numberOfLines={2}>
                    {profileAddress || "No profile address found"}
                  </Text>
                </View>
              </Pressable>
              <Pressable style={styles.addressOption} onPress={useCurrentLocation} disabled={isLocating}>
                <MaterialIcons name="my-location" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>
                    {isLocating ? "Getting current location..." : "Use current location phone"}
                  </Text>
                  <Text style={styles.optionSub}>Use GPS location for delivery</Text>
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

        <OrderSuccessPopup visible={showSuccess} message="Order created successfully" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${PRIMARY}1A`,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY },
  content: { paddingHorizontal: 16, paddingVertical: 16, gap: 24, paddingBottom: 200 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY, marginBottom: 10 },
  editText: { color: PRIMARY, fontSize: 13, fontWeight: "700" },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    backgroundColor: "#fff",
    padding: 12,
  },
  addressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${PRIMARY}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  addressTitle: { fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY },
  addressText: { fontSize: 13, color: SLATE_600, marginTop: 2 },
  errorText: { marginTop: 6, color: "#b91c1c", fontWeight: "600", fontSize: 12 },
  deliveryGrid: { flexDirection: "row", gap: 10 },
  deliveryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: `${PRIMARY}1A`,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  deliveryLabel: { fontSize: 12, color: SLATE_500, marginBottom: 3 },
  deliveryValue: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: "600" },
  deliveryTextInput: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: "600",
    paddingVertical: 0,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    padding: 12,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryImageWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: BORDER_SUBTLE,
  },
  summaryImage: { width: "100%", height: "100%" },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  summaryMeta: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  summaryPrice: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: `${PRIMARY}0D`,
    padding: 12,
  },
  paymentMethodsWrap: {
    gap: 10,
  },
  paymentOptionInactive: {
    borderWidth: 1,
    borderColor: `${PRIMARY}1A`,
    backgroundColor: "#fff",
  },
  walletTitle: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  walletSub: { fontSize: 11, color: SLATE_500, marginTop: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  cardForm: {
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 10,
    gap: 8,
  },
  cardInput: {
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 10,
    backgroundColor: BACKGROUND_LIGHT,
    color: TEXT_PRIMARY,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
  },
  cardInputHalf: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: `${PRIMARY}1A`,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  totalLine: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, color: SLATE_500 },
  totalMain: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4 },
  totalMainLabel: { fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY },
  totalMainValue: { fontSize: 20, fontWeight: "800", color: PRIMARY },
  placeBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 13,
  },
  placeBtnText: { fontSize: 16, color: "#fff", fontWeight: "700" },
  addressPopupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 40,
  },
  addressPopupCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
  },
  addressPopupTitle: { fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY, marginBottom: 4 },
  addressOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: BACKGROUND_LIGHT,
  },
  optionTitle: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY },
  optionSub: { marginTop: 2, fontSize: 12, color: SLATE_500 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: TEXT_PRIMARY },
  backToCartBtn: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backToCartText: { color: "#fff", fontWeight: "700" },
});
