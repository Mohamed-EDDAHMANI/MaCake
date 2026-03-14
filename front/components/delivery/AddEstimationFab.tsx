import { Pressable, StyleSheet, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PRIMARY } from "@/constants/colors";

export interface AddEstimationFabProps {
  onPress?: () => void;
  /** Optional style override for the container */
  style?: object;
  /** Optional position overrides (default: bottom 320, right 16) */
  bottom?: number;
  right?: number;
}

export function AddEstimationFab({ onPress, style, bottom = 320, right = 16 }: AddEstimationFabProps) {
  return (
    <Pressable
      style={[styles.fab, { bottom, right }, style]}
      onPress={onPress}
    >
      <MaterialIcons name="add-task" size={22} color="#fff" />
      <Text style={styles.fabText}>Add Estimation</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
