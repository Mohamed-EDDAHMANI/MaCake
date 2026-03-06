import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PRIMARY, PRIMARY_TINT } from "@/constants/colors";

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(count);
}

interface ProductLikesBadgeProps {
  count: number;
  /** Slightly smaller variant for tighter layouts */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Single, consistent likes count badge for product cards (Explore & Favorites).
 * Heart icon + number; large counts shown as 1k, 1.2k, etc.
 */
export function ProductLikesBadge({ count, compact, style }: ProductLikesBadgeProps) {
  const num = formatCount(count);
  const label = count === 1 ? "1 like" : `${num} likes`;
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]} collapsable={false}>
      <MaterialIcons
        name="favorite"
        size={compact ? 12 : 14}
        color={PRIMARY}
        style={compact ? styles.iconCompact : styles.icon}
      />
      <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: PRIMARY_TINT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    flexShrink: 0,
  },
  wrapCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  icon: { marginRight: 0 },
  iconCompact: { marginRight: 0 },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
  },
  textCompact: {
    fontSize: 11,
    fontWeight: "600",
  },
});
