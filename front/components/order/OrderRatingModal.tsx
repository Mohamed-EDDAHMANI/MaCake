import { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  PRIMARY,
  SURFACE,
  TEXT_PRIMARY,
  SLATE_500,
  SLATE_600,
  BORDER_SUBTLE,
} from "@/constants/colors";
import { createRatingApi } from "@/store/features/rating/ratingApi";
import type { ClientOrder, ClientOrderItem } from "@/store/features/order/orderApi";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=200&auto=format&fit=crop";

type ProductPreview = { title: string; imageUri?: string };

export type DeliveryForRating = {
  userId: string;
  name: string;
  photo: string | null;
};

export function OrderRatingModal({
  visible,
  order,
  productById,
  patissiereId,
  patissiereName,
  patissierePhoto,
  clientId,
  delivery,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  order: ClientOrder;
  productById: Record<string, ProductPreview>;
  patissiereId: string;
  patissiereName?: string;
  patissierePhoto?: string | null;
  clientId: string;
  delivery?: DeliveryForRating | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [patissiereStars, setPatissiereStars] = useState(0);
  const [patissiereComment, setPatissiereComment] = useState("");
  const [productStars, setProductStars] = useState<Record<string, number>>({});
  const [deliveryStars, setDeliveryStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvePhoto = (photo?: string | null) => {
    if (!photo) return null;
    return photo.startsWith("http") ? photo : `${photo}`;
  };

  const handleSubmit = async () => {
    if (patissiereStars < 1 || patissiereStars > 5) {
      setError("Please rate the patissiere (1-5 stars).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createRatingApi({
        fromUserId: clientId,
        toUserId: patissiereId,
        orderId: order.id,
        stars: patissiereStars,
        comment: patissiereComment.trim() || undefined,
      });
      if (delivery && deliveryStars >= 1 && deliveryStars <= 5) {
        await createRatingApi({
          fromUserId: clientId,
          toUserId: delivery.userId,
          orderId: order.id,
          stars: deliveryStars,
        });
      }
      const productIds = Array.from(new Set(order.items.map((i) => i.productId).filter(Boolean)));
      for (const productId of productIds) {
        const stars = productStars[productId] ?? 0;
        if (stars >= 1 && stars <= 5) {
          await createRatingApi({
            fromUserId: clientId,
            toUserId: patissiereId,
            productId,
            stars,
          });
        }
      }
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit rating";
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />
          <Text style={styles.title}>Rate your order</Text>
          <Text style={styles.subtitle}>Rate the patissiere and products (optional)</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patissiere</Text>
              <View style={styles.personRow}>
                <Image
                  source={{ uri: resolvePhoto(patissierePhoto) ?? FALLBACK_IMAGE }}
                  style={styles.avatar}
                />
                <Text style={styles.personName} numberOfLines={1}>
                  {patissiereName ?? "Patissiere"}
                </Text>
              </View>
              <StarPicker value={patissiereStars} onChange={setPatissiereStars} />
              <TextInput
                style={styles.commentInput}
                placeholder="Comment (optional)"
                placeholderTextColor={SLATE_500}
                value={patissiereComment}
                onChangeText={setPatissiereComment}
                multiline
                numberOfLines={2}
              />
            </View>

            {delivery ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Delivery</Text>
                <View style={styles.personRow}>
                  <Image
                    source={{ uri: resolvePhoto(delivery.photo) ?? FALLBACK_IMAGE }}
                    style={styles.avatar}
                  />
                  <Text style={styles.personName} numberOfLines={1}>
                    {delivery.name}
                  </Text>
                </View>
                <StarPicker value={deliveryStars} onChange={setDeliveryStars} />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Products</Text>
              {order.items.map((item: ClientOrderItem, idx: number) => {
                const productId = item.productId;
                const product = productById[productId];
                const title = product?.title ?? `Item ${(idx + 1)}`;
                const imageUri = product?.imageUri ?? FALLBACK_IMAGE;
                return (
                  <View key={`${productId}-${idx}`} style={styles.productRow}>
                    <Image source={{ uri: imageUri }} style={styles.productThumb} />
                    <View style={styles.productInfo}>
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      <StarPicker
                        value={productStars[productId] ?? 0}
                        onChange={(s) => setProductStars((prev) => ({ ...prev, [productId]: s }))}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="star" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit rating</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          style={styles.starBtn}
          hitSlop={8}
        >
          <MaterialIcons
            name={value >= star ? "star" : "star-border"}
            size={28}
            color={value >= star ? "#f59e0b" : SLATE_500}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER_SUBTLE,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: SLATE_500,
    marginBottom: 20,
  },
  scroll: { maxHeight: 360 },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: SLATE_600,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BORDER_SUBTLE,
  },
  personName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  starBtn: {
    padding: 4,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    minHeight: 60,
    textAlignVertical: "top",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
    gap: 12,
  },
  productThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: BORDER_SUBTLE,
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: SLATE_600,
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
