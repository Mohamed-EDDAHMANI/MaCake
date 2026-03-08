/**
 * Shared floating pill tab bar style for all tab layouts in the app.
 * Use in (main)/(tabs) and any other Tabs layout (e.g. auth tabs if added).
 */
import { View, Text, StyleSheet, Platform, Animated } from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { PRIMARY, SLATE_400 } from "@/constants/colors";

export const TAB_BAR_BOTTOM = 16;
export const TAB_BAR_HORIZONTAL = 24;

const tabBarStyles = StyleSheet.create({
  tabBarOverlay: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 9999,
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    marginVertical: 13,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: `${PRIMARY}15`,
    width: 80,
    height: 36,
    borderRadius: 100,
    paddingStart: 30,
    // paddingHorizontal: -40,
  },
  iconContent: {
    flexDirection: "row",
    // backgroundColor: "red",
    alignItems: "center",
    justifyContent: "center",
  },
  iconOnlyWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: {
    // backgroundColor: "green",
    overflow: "hidden",
    marginStart: -5,
  },
  titleText: {
    // backgroundColor: "red",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

const createBtnStyles = StyleSheet.create({
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
});
export const createBtnStyle = createBtnStyles.createBtn;

export function AnimatedTabIcon({
  iconName,
  title,
  focused,
  color,
}: {
  iconName: string;
  title: string;
  focused: boolean;
  color: string;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: focused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [focused, animatedValue]);

  const width = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[tabBarStyles.iconWrap, focused && tabBarStyles.iconWrapActive]}>
      <View style={tabBarStyles.iconContent}>
        <View style={tabBarStyles.iconOnlyWrap}>
          <MaterialIcons name={iconName as any} size={22} color={color} />
        </View>
        <Animated.View style={[tabBarStyles.titleWrapper, { width, opacity }]}>
          <Text style={[tabBarStyles.titleText, { color }]}>{title}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Returns screenOptions for expo-router Tabs to get the shared floating pill tab bar.
 * Use: <Tabs screenOptions={getSharedTabBarScreenOptions()} />
 */
export function getSharedTabBarScreenOptions() {
  return {
    headerShown: false,
    tabBarStyle: [
      {
        position: "absolute" as const,
        bottom: TAB_BAR_BOTTOM,
        left: TAB_BAR_HORIZONTAL,
        right: TAB_BAR_HORIZONTAL,
        borderRadius: 9999,
        marginHorizontal: 15,
        height: 64,
        paddingTop: 0,
        paddingBottom: 0,
        paddingHorizontal: 13,
        backgroundColor:
          Platform.OS === "android" ? "rgba(255,255,255,0.95)" : "transparent",
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: "rgba(226, 232, 240, 0.6)",
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
          },
          android: { elevation: 10 },
        }),
      },
    ],
    tabBarBackground: () => (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={90}
            tint="light"
            style={[StyleSheet.absoluteFill, { borderRadius: 9999, overflow: "hidden" }]}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, tabBarStyles.tabBarOverlay]} />
      </View>
    ),
    tabBarActiveTintColor: PRIMARY,
    tabBarInactiveTintColor: SLATE_400,
    tabBarIconStyle: { marginBottom: 0 },
    tabBarItemStyle: tabBarStyles.tabBarItem,
    tabBarLabelPosition: "below-icon" as const,
    tabBarHideOnKeyboard: true,
    tabBarLabel: () => null,
  };
}
