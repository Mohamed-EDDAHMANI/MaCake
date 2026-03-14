import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { PRIMARY, SLATE_400, TEXT_PRIMARY } from "@/constants/colors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateUser } from "@/store/features/auth";
import { confirmWalletTopUpApi, createWalletTopUpIntentApi } from "@/store/features/payment/paymentApi";
import { getStripeModuleSafe } from "@/lib/stripe-safe";

/* ─── types ─── */
type TransactionType = "purchase" | "topup";

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: string;
  type: TransactionType;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "t1", title: "Boutique Chocolate Fondant", date: "24 Jan 2024 • 14:20", amount: "- €45.00", type: "purchase" },
  { id: "t2", title: "Wallet Top Up", date: "20 Jan 2024 • 09:15", amount: "+ €100.00", type: "topup" },
  { id: "t3", title: "Velvet Berry Cheesecake", date: "15 Jan 2024 • 18:45", amount: "- €32.50", type: "purchase" },
  { id: "t4", title: "Glazed Luxury Tower", date: "10 Jan 2024 • 11:30", amount: "- €58.00", type: "purchase" },
];

/* ─── sub-components ─── */
function TransactionRow({ tx }: { tx: Transaction }) {
  const isTopUp = tx.type === "topup";
  return (
    <View className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-slate-100" style={s.txShadow}>
      <View className="flex-row items-center gap-4">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: isTopUp ? "#ecfdf5" : "#f8fafc" }}
        >
          <MaterialIcons
            name={isTopUp ? "add-card" : "shopping-bag"}
            size={20}
            color={isTopUp ? "#10b981" : SLATE_400}
          />
        </View>
        <View>
          <Text className="text-sm font-bold text-slate-900">{tx.title}</Text>
          <Text className="text-[10px] font-medium text-slate-400 mt-0.5">{tx.date}</Text>
        </View>
      </View>
      <Text className="text-sm font-bold" style={{ color: isTopUp ? "#10b981" : TEXT_PRIMARY }}>
        {tx.amount}
      </Text>
    </View>
  );
}

/* ─── main ─── */
export function WalletTab() {
  const dispatch = useAppDispatch();
  const walletBalance = Number(useAppSelector((state) => state.auth.user?.walletBalance ?? 0));
  const userName = useAppSelector((state) => state.auth.user?.name ?? "");
  const userEmail = useAppSelector((state) => state.auth.user?.email ?? "");
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("100");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountPresets = useMemo(() => [50, 100, 200], []);
  const balanceLabel = useMemo(() => `${walletBalance.toFixed(2)} MAD`, [walletBalance]);
  const normalizedTopUpAmount = useMemo(() => {
    const parsed = Number(customAmount.replace(",", "."));
    if (!Number.isFinite(parsed)) return 0;
    return Number(parsed.toFixed(2));
  }, [customAmount]);

  const handleTopUp = async () => {
    if (isTopUpLoading) return;
    if (normalizedTopUpAmount <= 0) {
      setError("Please enter a valid top-up amount.");
      return;
    }
    try {
      setError(null);
      setIsTopUpLoading(true);

      const before = walletBalance;
      const intent = await createWalletTopUpIntentApi(normalizedTopUpAmount);
      const paymentIntentClientSecret = intent.paymentIntentClientSecret;
      const paymentIntentId = intent.paymentIntentId;
      if (!paymentIntentClientSecret || !paymentIntentId) {
        throw new Error("Stripe payment intent data is missing.");
      }

      const stripe = getStripeModuleSafe();
      if (!stripe?.initPaymentSheet || !stripe?.presentPaymentSheet) {
        throw new Error(
          "Stripe modal needs a development build. Run: npx expo run:android (or iOS) and test again."
        );
      }

      const initResult = await stripe.initPaymentSheet({
        merchantDisplayName: "MaCake",
        paymentIntentClientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: userName || undefined,
          email: userEmail || undefined,
        },
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

      const confirmed = await confirmWalletTopUpApi(paymentIntentId);
      const serverBalance = Number(confirmed.walletBalance);
      // Top-up should only increase wallet amount.
      const latest =
        Number.isFinite(serverBalance) && serverBalance >= before
          ? serverBalance
          : Number((before + normalizedTopUpAmount).toFixed(2));
      dispatch(updateUser({ walletBalance: Number(latest.toFixed(2)) }));

      const now = new Date();
      const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const paidAmount = Number((Math.max(0, latest - before)).toFixed(2));
      if (paidAmount > 0) {
        setTransactions((prev) => [
          {
            id: `topup-${now.getTime()}`,
            title: "Wallet Top Up (Stripe)",
            date: `${date} • ${time}`,
            amount: `+ ${paidAmount.toFixed(2)} MAD`,
            type: "topup",
          },
          ...prev,
        ]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Top up failed. Please try again.");
    } finally {
      setIsTopUpLoading(false);
    }
  };

  return (
    <View className="p-5 gap-6" style={{ backgroundColor: "#f8f5f6" }}>
      {/* ── Balance Card ── */}
      <LinearGradient
        colors={["#fb5187", "#ff7eaf"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-3xl p-6 overflow-hidden"
        style={s.balanceShadow}
      >
        {/* Decorative watermark */}
        <View className="absolute top-0 right-0 opacity-10" style={{ transform: [{ translateX: 30 }, { translateY: -30 }] }}>
          <MaterialIcons name="payments" size={140} color="#fff" />
        </View>

        <View className="relative z-10">
          <Text className="text-white/80 text-xs font-bold uppercase" style={{ letterSpacing: 2 }}>
            Current Balance
          </Text>
          <Text className="text-white text-4xl font-extrabold mt-1" style={{ letterSpacing: -1 }}>
            {balanceLabel}
          </Text>

          <View className="flex-row gap-3 mt-8">
            <Pressable
              className="flex-1 bg-white h-11 rounded-xl flex-row items-center justify-center gap-2"
              style={s.topUpShadow}
              onPress={handleTopUp}
              disabled={isTopUpLoading}
            >
              <MaterialIcons name="add-circle" size={18} color={PRIMARY} />
              <Text className="text-sm font-bold" style={{ color: PRIMARY }}>
                {isTopUpLoading ? "Processing..." : "Top Up"}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-2"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <MaterialIcons name="account-balance" size={18} color="#fff" />
              <Text className="text-sm font-bold text-white">Withdraw</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <View className="bg-white rounded-2xl p-4 border border-slate-100 gap-3" style={s.txShadow}>
        <Text className="text-[11px] font-bold text-slate-400 uppercase" style={{ letterSpacing: 2 }}>
          Top Up Amount (Stripe)
        </Text>
        <View className="flex-row gap-2" style={s.presetsRow}>
          {amountPresets.map((amount) => {
            const active = selectedAmount === amount;
            return (
              <Pressable
                key={amount}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount(String(amount));
                  setError(null);
                }}
                className="px-3 py-2 rounded-full border"
                style={{
                  borderColor: active ? PRIMARY : "#e2e8f0",
                  backgroundColor: active ? "#fdf2f8" : "#fff",
                }}
              >
                <Text style={{ color: active ? PRIMARY : TEXT_PRIMARY, fontWeight: "700", fontSize: 12 }}>
                  {amount} MAD
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.amountInputWrap}>
          <View style={s.amountInputIcon}>
            <MaterialIcons name="payments" size={18} color={PRIMARY} />
          </View>
          <TextInput
            value={customAmount}
            onChangeText={(value) => {
              const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
              const dotIndex = normalized.indexOf(".");
              const sanitized =
                dotIndex >= 0
                  ? `${normalized.slice(0, dotIndex + 1)}${normalized
                      .slice(dotIndex + 1)
                      .replace(/\./g, "")}`
                  : normalized;
              setCustomAmount(sanitized);
                  setSelectedAmount(null);
              setError(null);
            }}
            placeholder="Enter custom amount"
            placeholderTextColor={SLATE_400}
            keyboardType="decimal-pad"
            style={s.amountInput}
          />
          <Text style={s.amountCurrency}>MAD</Text>
        </View>
        {error ? (
          <Text style={{ color: "#b91c1c", fontSize: 12, fontWeight: "600" }}>{error}</Text>
        ) : (
          <Text style={{ color: SLATE_400, fontSize: 11 }}>
            Payment modal opens inside the app (Stripe PaymentSheet). Amount: {normalizedTopUpAmount.toFixed(2)} MAD
          </Text>
        )}
      </View>

      {/* ── Recent Transactions ── */}
      <View className="gap-4">
        <View className="flex-row justify-between items-end px-1">
          <Text className="text-[11px] font-bold text-slate-400 uppercase" style={{ letterSpacing: 2 }}>
            Recent Transactions
          </Text>
          <Pressable>
            <Text className="text-[10px] font-bold uppercase" style={{ color: PRIMARY, letterSpacing: 2 }}>
              View All
            </Text>
          </Pressable>
        </View>

        <View className="gap-3">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  balanceShadow: {
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  topUpShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  txShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  presetsRow: {
    flexWrap: "wrap",
  },
  amountInputWrap: {
    height: 46,
    borderWidth: 1,
    borderColor: "#f0c4d4",
    borderRadius: 12,
    backgroundColor: "#fff7fa",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  amountInputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fde7ef",
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 0,
  },
  amountCurrency: {
    fontSize: 12,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
});
