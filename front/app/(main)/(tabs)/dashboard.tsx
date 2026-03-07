import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { BACKGROUND_LIGHT, TEXT_PRIMARY, SLATE_600 } from "@/constants/colors";
import { TabScreenWithAnimation } from "@/components/TabScreenWithAnimation";

export default function MainDashboardScreen() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role !== "PATISSIERE" && role !== "LIVREUR") {
    return <Redirect href="/(main)" />;
  }

  return (
    <TabScreenWithAnimation>
      <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND_LIGHT }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY }}>
            Dashboard
          </Text>
          <Text style={{ fontSize: 14, color: SLATE_600, marginTop: 10, textAlign: "center" }}>
            {role === "PATISSIERE"
              ? "Manage your products and orders."
              : "Manage your deliveries and earnings."}
          </Text>
        </View>
      </SafeAreaView>
    </TabScreenWithAnimation>
  );
}

