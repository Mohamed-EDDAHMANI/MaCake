import { View, TextInput, StyleSheet, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PRIMARY, SURFACE, BORDER, SLATE_400, TEXT_PRIMARY } from "@/constants/colors";

export const SEARCH_PLACEHOLDER = "Search cakes or pastry chefs";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = SEARCH_PLACEHOLDER,
  containerStyle,
  autoFocus,
}: SearchBarProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <MaterialIcons name="search" size={22} color={PRIMARY} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SLATE_400}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: { position: "absolute", left: 28, zIndex: 1 },
  input: {
    height: 48,
    width: "100%",
    paddingLeft: 48,
    paddingRight: 16,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
});
