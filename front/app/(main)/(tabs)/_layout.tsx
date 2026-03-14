import { View } from "react-native";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { useAppSelector } from "@/store/hooks";
import { useAuthModal } from "@/contexts/AuthModalContext";
import {
  getSharedTabBarScreenOptions,
  AnimatedTabIcon,
  createBtnStyle,
} from "@/components/shared-tab-bar";

export default function TabsLayout() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role);
  const { showAuthModal } = useAuthModal();

  const isPatissiere = isAuthenticated && role === "PATISSIERE";
  // Dashboard for livreur is accessed via sidebar "Work space" (separate screen), not as a tab
  const showDashboard = false;

  const screenOptions = getSharedTabBarScreenOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              iconName="explore"
              title="Home"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Likes",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              iconName="favorite"
              title="Likes"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          href: isPatissiere ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              iconName="shopping-cart"
              title="Cart"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          href: isPatissiere ? undefined : null,
          tabBarStyle: { display: "none" },
          tabBarIcon: () => (
            <View style={createBtnStyle}>
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
            <AnimatedTabIcon
              iconName="shopping-bag"
              title="Orders"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: showDashboard ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              iconName="local-shipping"
              title="Dashboard"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAuthenticated ? "Profile" : "Login",
          href: undefined,
          tabBarButton: isAuthenticated
            ? undefined
            : (props: BottomTabBarButtonProps) => (
                <PlatformPressable {...props} onPress={() => showAuthModal()} />
              ),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              iconName={isAuthenticated ? "person" : "login"}
              title={isAuthenticated ? "Profile" : "Login"}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
