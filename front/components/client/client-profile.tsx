import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/features/auth";
import { PRIMARY, SLATE_400 } from "@/constants/colors";
import { ProfileHero } from "./profile-hero";
import { WalletTab } from "./wallet-tab";
import { OrdersTab } from "./orders-tab";
import { FavoritesTab } from "./favorites-tab";
import { EmptyTab } from "./empty-tab";

/* ─── tab definitions ─── */
type TabName = "Wallet" | "Orders" | "Reviews" | "Favorites" | "Alerts";

interface TabDef {
  name: TabName;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const TABS: TabDef[] = [
  { name: "Wallet", icon: "account-balance-wallet" },
  { name: "Orders", icon: "shopping-bag" },
  { name: "Reviews", icon: "star" },
  { name: "Favorites", icon: "favorite" },
  { name: "Alerts", icon: "notifications" },
];

/* ─── component ─── */
export function ClientProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabName>("Orders");

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/");
  };

  /* ─── resolve active tab content ─── */
  const renderTabContent = () => {
    switch (activeTab) {
      case "Wallet":
        return <WalletTab />;
      case "Orders":
        return <OrdersTab />;
      case "Reviews":
        return <EmptyTab icon="star-outline" title="Reviews" description="Your reviews and ratings will appear here." />;
      case "Favorites":
        return <FavoritesTab />;
      case "Alerts":
        return <EmptyTab icon="notifications-none" title="Alerts" description="Your notifications will appear here." />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─ Hero ─ */}
        <ProfileHero />

        {/* ─ Tabs ─ */}
        <View className="bg-white border-b border-background-light">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => setActiveTab(tab.name)}
                  className="items-center justify-center pt-4 pb-3 gap-1"
                  style={{ borderBottomWidth: 3, borderBottomColor: isActive ? PRIMARY : "transparent" }}
                >
                  <MaterialIcons name={tab.icon} size={22} color={isActive ? PRIMARY : SLATE_400} />
                  <Text
                    className="text-[10px] font-bold uppercase"
                    style={{ letterSpacing: 1.5, color: isActive ? PRIMARY : SLATE_400 }}
                  >
                    {tab.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ─ Tab Content ─ */}
        {renderTabContent()}

        {/* ─ Log Out ─ */}
        <Pressable
          className="flex-row items-center justify-center mt-6 mx-4 py-3.5 bg-red-50 rounded-xl gap-2"
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text className="text-[15px] font-semibold text-red-500">Log Out</Text>
        </Pressable>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
