import { View, Text, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppSelector } from "@/store/hooks";
import { PRIMARY, SLATE_400, SURFACE } from "@/constants/colors";

const TAB_BAR_BOTTOM = 16;
const TAB_BAR_HORIZONTAL = 24;

export default function TabsLayout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role);

  const isPatissiere = isAuthenticated && role === "PATISSIERE";
  const showDashboard = isAuthenticated && role === "LIVREUR";

  const screenOptions = {
    headerShown: false,
    tabBarStyle: [
      {
        position: "absolute" as const,
        bottom: TAB_BAR_BOTTOM,
        left: TAB_BAR_HORIZONTAL,
        right: TAB_BAR_HORIZONTAL,
        borderRadius: 9999,
        height: 64,
        paddingTop: 0,
        paddingBottom: 0,
        paddingHorizontal: 6,
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
        <View style={[StyleSheet.absoluteFill, styles.tabBarOverlay]} />
      </View>
    ),
    tabBarActiveTintColor: PRIMARY,
    tabBarInactiveTintColor: SLATE_400,
    tabBarIconStyle: { marginBottom: 0 },
    tabBarItemStyle: styles.tabBarItem,
    tabBarLabelPosition: "below-icon" as const,
    tabBarHideOnKeyboard: true,
    // Active tab: icon + label inside a floating pill
    tabBarLabel: ({
      focused,
      color,
      children,
    }: {
      focused: boolean;
      color: string;
      children: string;
    }) =>
      focused ? (
        <Text style={[styles.activeLabel, { color }]}>{children}</Text>
      ) : null,
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialIcons name="explore" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          href: isPatissiere ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialIcons name="search" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialIcons name="favorite" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          href: isPatissiere ? undefined : null,
          tabBarIcon: () => (
            <View style={s.createBtn}>
              <MaterialIcons name="add" size={24} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialIcons name="shopping-bag" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: showDashboard ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialIcons name="local-shipping" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAuthenticated ? "Profile" : "Login",
          href: isAuthenticated ? undefined : "/(auth)/login",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <MaterialIcons
                name={isAuthenticated ? "person" : "login"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOverlay: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 9999,
  },

  tabBarItem: {
    // Each tab takes equal flexible space, centered
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    marginVertical: 6,
  },

  // Icon container — becomes a pill when focused
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: `${PRIMARY}15`, // ~8% opacity tint of PRIMARY
    width: 48,
    height: 36,
    borderRadius: 18,
  },

  // Label sits tight under the pill, only when active
  activeLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: -2,
    textTransform: "uppercase",
  },
});

const s = StyleSheet.create({
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