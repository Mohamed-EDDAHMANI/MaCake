import { View, Text, StyleSheet } from "react-native";
import { PRIMARY } from "@/constants/colors";

interface CategoryBadgeProps {
  /** Category name (displayed uppercase). */
  name: string;
}

/**
 * Same category pill badge for product cards (Explore & Favorites).
 * Position: absolute bottom-left on the image; parent must have position: relative.
 */
export function CategoryBadge({ name }: CategoryBadgeProps) {
  const label = (name || "PRODUCT").toUpperCase();
  return (
    <View style={styles.badge}>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    maxWidth: "70%",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
});
