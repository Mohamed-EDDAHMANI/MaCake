import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  PRIMARY,
  SURFACE,
  TEXT_PRIMARY,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  BORDER_SUBTLE,
} from "@/constants/colors";
import {
  createClientEstimationApi,
  createDeliveryEstimationApi,
  type EstimationItem,
} from "@/store/features/estimation";

export interface EstimationCreateModalProps {
  visible: boolean;
  orderId: string;
  /** 'client' = client estimation, 'delivery' = delivery estimation (livreur) */
  role?: "client" | "delivery";
  onClose: () => void;
  onSuccess?: (result: { orderId: string; estimation?: EstimationItem }) => void;
}

export function EstimationCreateModal({
  visible,
  orderId,
  role = "client",
  onClose,
  onSuccess,
}: EstimationCreateModalProps) {
  const [price, setPrice] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const numPrice = parseFloat(price);
    const mins = estimatedMinutes.trim() ? parseInt(estimatedMinutes, 10) : null;
    if (Number.isNaN(numPrice) || numPrice < 0) {
      setError("Please enter a valid delivery price.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const details = mins != null && !Number.isNaN(mins)
        ? `Estimated time: ${mins} min`
        : "Delivery estimation";
      const payload = { orderId, details, price: numPrice };
      let created: EstimationItem | undefined;
      if (role === "delivery") {
        const res = await createDeliveryEstimationApi(payload) as any;
        created = (res?.data ?? res) as EstimationItem;
      } else {
        const res = await createClientEstimationApi(payload) as any;
        created = (res?.data ?? res) as EstimationItem;
      }
      setPrice("");
      setEstimatedMinutes("");
      onClose();
      onSuccess?.({ orderId, estimation: created });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send estimation");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setPrice("");
    setEstimatedMinutes("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={styles.modalWrap} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleBar}>
              <View style={styles.handle} />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Send Your Estimation</Text>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="local-shipping" size={22} color={PRIMARY} />
                </View>
              </View>

              <View style={styles.fields}>
                <Text style={styles.label}>Delivery Price (MAD)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <MaterialIcons name="payments" size={20} color={SLATE_400} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={SLATE_400}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.fields}>
                <Text style={styles.label}>Estimated Time (min)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <MaterialIcons name="schedule" size={20} color={SLATE_400} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 25"
                    placeholderTextColor={SLATE_400}
                    value={estimatedMinutes}
                    onChangeText={setEstimatedMinutes}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.actions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send Estimation</Text>
                  )}
                </Pressable>
              </View>
            </View>
            <View style={styles.safeBottom} />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  modalWrap: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: SURFACE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  handleBar: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: SLATE_200,
  },
  content: {
    padding: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PRIMARY}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  fields: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: SLATE_500,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SLATE_200,
    backgroundColor: "#f8fafc",
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingRight: 16,
    fontSize: 18,
    fontWeight: "500",
    color: TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: SLATE_600,
  },
  sendBtn: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.8 },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  safeBottom: {
    height: 16,
    backgroundColor: SURFACE,
  },
});
