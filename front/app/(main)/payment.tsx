import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BACKGROUND_LIGHT,
  BORDER,
  BORDER_SUBTLE,
  PRIMARY,
  PRIMARY_05,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SURFACE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateUser } from "@/store/features/auth/authSlice";
import {
  confirmOrderStripePaymentApi,
  createOrderPaymentApi,
} from "@/store/features/payment/paymentApi";
import { getStripeModuleSafe } from "@/lib/stripe-safe";
import OrderSuccessPopup from "@/components/product-detail/OrderSuccessPopup";

type PaymentMethod = "wallet" | "stripe";

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "0.00 MAD";
  return `${value.toFixed(2)} MAD`;
}

export default function PaymentScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ orderId?: string; total?: string }>();
  const user = useAppSelector((state) => state.auth.user);

  const orderId =
    typeof params.orderId === "string" && params.orderId.trim().length > 0
      ? params.orderId
      : "UNKNOWN";

  const totalPrice = useMemo(() => {
    const n = Number(params.total);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [params.total]);

  const walletBalance = Number(user?.walletBalance ?? 0);
  const walletShortfall = Math.max(0, totalPrice - walletBalance);
  const walletCanCover = walletShortfall <= 0;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    walletCanCover ? "wallet" : "stripe"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleWalletPay = async () => {
    if (!walletCanCover) {
      setError("Top up your wallet.");
      return;
    }
    if (isProcessing) return;

    try {
      setError(null);
      setIsProcessing(true);
      const paid = await createOrderPaymentApi({
        orderId,
        paymentMethod: "wallet",
      });
      const nextBalance = Number(
        paid.walletBalance ?? Math.max(0, walletBalance - totalPrice)
      );
      dispatch(updateUser({ walletBalance: Number(nextBalance.toFixed(2)) }));

      setShowSuccess(true);
      // Navigate back to order details after showing success briefly
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Wallet payment failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeDirectPay = async () => {
    if (isProcessing) return;
    try {
      setError(null);
      setIsProcessing(true);
      const intent = await createOrderPaymentApi({
        orderId,
        paymentMethod: "stripe_card",
      });
      const paymentIntentClientSecret = intent.paymentIntentClientSecret;
      const paymentIntentId = intent.paymentIntentId;
      if (!paymentIntentClientSecret || !paymentIntentId) {
        throw new Error("Stripe payment intent data is missing.");
      }

      const stripe = getStripeModuleSafe();
      if (!stripe?.initPaymentSheet || !stripe?.presentPaymentSheet) {
        throw new Error(
          "Stripe card payment needs a development build. Run: npx expo run:android (or iOS) and try again."
        );
      }

      const initResult = await stripe.initPaymentSheet({
        merchantDisplayName: "MaCake",
        paymentIntentClientSecret,
        allowsDelayedPaymentMethods: false,
      });
      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      const presentResult = await stripe.presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code === "Canceled") {
          return;
        }
        throw new Error(presentResult.error.message);
      }

      await confirmOrderStripePaymentApi(paymentIntentId);

      setShowSuccess(true);
      // Navigate back to order details after showing success briefly
      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Stripe payment failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmLabel = useMemo(() => {
    if (selectedMethod === "wallet") return "Confirm Wallet Payment";
    return "Pay with Stripe";
  }, [selectedMethod]);

  const onConfirmPress = async () => {
    if (totalPrice <= 0) {
      setError("Missing total price. Please go back and try again.");
      return;
    }
    if (selectedMethod === "wallet") {
      await handleWalletPay();
      return;
    }
    await handleStripeDirectPay();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={20} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.headerTitle}>Choose Payment Method</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Order Summary</Text>
            <Text style={styles.orderIdText}>#{orderId.slice(-6).toUpperCase()}</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalAmount}>{formatMoney(totalPrice)}</Text>
              <Text style={styles.totalHint}>Total Amount</Text>
            </View>
          </View>

          <View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>MaCake Wallet</Text>
              <View style={styles.defaultChip}>
                <Text style={styles.defaultChipText}>Default</Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.paymentCard,
                selectedMethod === "wallet" ? styles.paymentCardSelected : styles.paymentCardUnselected,
              ]}
              onPress={() => {
                setSelectedMethod("wallet");
                setError(null);
              }}
            >
              <View style={styles.paymentIcon}>
                <MaterialIcons name="account-balance-wallet" size={22} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Balance: {formatMoney(walletBalance)}</Text>
                <Text style={[styles.paymentSub, !walletCanCover && styles.warningText]}>
                  {walletCanCover ? "Wallet balance is enough" : "Insufficient wallet balance"}
                </Text>
              </View>
              <View style={styles.radioOuter}>
                {selectedMethod === "wallet" ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>

            {!walletCanCover ? (
              <View style={styles.warningCard}>
                <View style={styles.warningRow}>
                  <MaterialIcons name="info" size={14} color="#b45309" />
                  <Text style={styles.warningAmount}>Remaining to pay: {formatMoney(walletShortfall)}</Text>
                </View>
                <Text style={styles.warningAmount}>Top up your wallet or choose card payment.</Text>
              </View>
            ) : null}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Debit / Credit Card</Text>
            <Pressable
              style={[
                styles.paymentCard,
                selectedMethod === "stripe" ? styles.paymentCardSelected : styles.paymentCardUnselected,
              ]}
              onPress={() => {
                setSelectedMethod("stripe");
                setError(null);
              }}
            >
              <View style={styles.paymentIcon}>
                <MaterialIcons name="credit-card" size={22} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentTitle}>Pay with Stripe</Text>
                <Text style={styles.paymentSub}>Secure card payment</Text>
              </View>
              <View style={styles.radioOuter}>
                {selectedMethod === "stripe" ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          </View>

          <View style={styles.secureBadge}>
            <MaterialIcons name="verified-user" size={16} color="#047857" />
            <Text style={styles.secureBadgeText}>Secure 256-bit SSL encrypted payment</Text>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.confirmBtn, isProcessing && { opacity: 0.75 }]}
            onPress={onConfirmPress}
            disabled={isProcessing}
          >
            <Text style={styles.confirmBtnText}>{isProcessing ? "Processing..." : confirmLabel}</Text>
            <Text style={styles.confirmBtnAmount}>{formatMoney(totalPrice)}</Text>
          </Pressable>
        </View>

        <OrderSuccessPopup visible={showSuccess} message="Payment successful" />
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
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT_PRIMARY },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 160, gap: 18 },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    backgroundColor: SURFACE,
    padding: 14,
    gap: 6,
  },
  summaryLabel: { fontSize: 11, fontWeight: "800", color: SLATE_500, textTransform: "uppercase", letterSpacing: 1 },
  orderIdText: { fontSize: 20, fontWeight: "900", color: TEXT_PRIMARY },
  totalRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  totalAmount: { fontSize: 28, fontWeight: "900", color: PRIMARY },
  totalHint: { fontSize: 12, color: SLATE_500, marginBottom: 3 },

  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY, marginBottom: 8 },
  defaultChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: PRIMARY_05,
    borderWidth: 1,
    borderColor: `${PRIMARY}2B`,
  },
  defaultChipText: { fontSize: 11, fontWeight: "700", color: PRIMARY },

  paymentCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentCardSelected: {
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_05,
  },
  paymentCardUnselected: { borderColor: BORDER_SUBTLE },
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_05,
  },
  paymentTitle: { fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY },
  paymentSub: { marginTop: 1, fontSize: 12, color: SLATE_500, fontWeight: "500" },
  warningText: { color: "#9a3412", fontWeight: "700" },

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

  warningCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    padding: 10,
    gap: 10,
  },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  warningAmount: { fontSize: 12, fontWeight: "700", color: "#b45309" },
  secureBadge: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
  },
  secureBadgeText: { fontSize: 11, color: SLATE_600, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  errorText: { marginTop: 2, color: "#b91c1c", fontWeight: "600", fontSize: 12, textAlign: "center" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
    backgroundColor: BACKGROUND_LIGHT,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  confirmBtnAmount: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
