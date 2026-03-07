import { ReactNode } from "react";
import Animated, { FadeIn } from "react-native-reanimated";

const TAB_FADE_DURATION = 220;

/**
 * Wraps tab screen content so it fades in when the tab is focused.
 * Use in (main)/(tabs)/*.tsx for consistent tab switch animation.
 */
export function TabScreenWithAnimation({ children }: { children: ReactNode }) {
  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={FadeIn.duration(TAB_FADE_DURATION)}
    >
      {children}
    </Animated.View>
  );
}
