import { View, Pressable, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PRIMARY } from "@/constants/colors";

interface ModifyProfileButtonProps {
  label: string;
  onPress: () => void;
}

/**
 * Same Modify Profile button style on all profiles (client, patissiere, delivery).
 */
export function ModifyProfileButton({ label, onPress }: ModifyProfileButtonProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.btn}
        onPress={onPress}
      >
        <MaterialIcons name="edit" size={18} color={PRIMARY} />
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f8f6f7",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.3,
  },
});
