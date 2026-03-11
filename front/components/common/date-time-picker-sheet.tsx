import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  BACKGROUND_LIGHT,
  BORDER_SUBTLE,
  PRIMARY,
  SLATE_500,
  SURFACE,
  TEXT_PRIMARY,
} from "@/constants/colors";
import DeliveryDateScroller from "@/components/common/delivery-date-scroller";
import DeliveryTimeScroller from "@/components/common/delivery-time-scroller";

type Props = {
  visible: boolean;
  selectedDate: string;
  selectedTime: string;
  onClose: () => void;
  onConfirm: (nextDate: string, nextTime: string) => void;
};

export default function DateTimePickerSheet({
  visible,
  selectedDate,
  selectedTime,
  onClose,
  onConfirm,
}: Props) {
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [draftTime, setDraftTime] = useState(selectedTime);

  useEffect(() => {
    if (!visible) return;
    setDraftDate(selectedDate);
    setDraftTime(selectedTime);
  }, [visible, selectedDate, selectedTime]);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Schedule Delivery</Text>
            <Text style={styles.subtitle}>Pick your preferred arrival time</Text>
          </View>

          <View style={styles.pickerRow}>
            <DeliveryDateScroller value={draftDate} onChange={setDraftDate} />
            <View style={styles.rowDivider} />
            <View style={{ flex: 1.1 }}>
              <DeliveryTimeScroller value={draftTime} onChange={setDraftTime} />
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.confirmBtn}
              onPress={() => {
                onConfirm(draftDate, draftTime);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Confirm Selection</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: `${PRIMARY}22`,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingBottom: 26,
    paddingTop: 6,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: BORDER_SUBTLE,
  },
  header: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  subtitle: {
    marginTop: 4,
    color: SLATE_500,
    fontSize: 13,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    height: 260,
    marginBottom: 14,
    backgroundColor: BACKGROUND_LIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PRIMARY}14`,
    padding: 8,
  },
  rowDivider: {
    width: 1,
    backgroundColor: `${PRIMARY}26`,
    marginVertical: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 0.42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: BACKGROUND_LIGHT,
  },
  cancelText: {
    color: TEXT_PRIMARY,
    fontWeight: "700",
  },
  confirmBtn: {
    flex: 0.58,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: PRIMARY,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "800",
  },
});
