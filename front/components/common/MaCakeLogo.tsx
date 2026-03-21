import { Image, Platform, StyleSheet, useWindowDimensions, View } from "react-native";

const icon = require("../../assets/images/MaCakeIcon.png");

/**
 * Size presets as a fraction of the screen's smaller dimension (width on portrait).
 * This keeps the icon proportional on every device — phone, tablet, small screen.
 */
const SIZE_RATIO: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 0.08,
  sm: 0.12,
  md: 0.18,
  lg: 0.25,
  xl: 0.35,
};

interface MaCakeLogoProps {
  /** Preset size token (default: "md") */
  size?: keyof typeof SIZE_RATIO;
  /** Explicit pixel size — overrides the size token */
  sizePx?: number;
}

export default function MaCakeLogo({ size = "md", sizePx }: MaCakeLogoProps) {
  const { width, height } = useWindowDimensions();
  const base = Math.min(width, height);

  const dim = sizePx ?? Math.round(base * SIZE_RATIO[size]);
  const radius = Math.round(dim * 0.22); // keeps Apple-style rounded corners

  return (
    <View
      style={[
        styles.shadow,
        { width: dim, height: dim, borderRadius: radius },
      ]}
    >
      <Image
        source={icon}
        style={{ width: dim, height: dim, borderRadius: radius }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#9A0F45",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
});
