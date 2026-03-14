import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, getProfile, setProfileStats, updateUser } from "@/store/features/auth";
import { PRIMARY, SLATE_400, SLATE_500, SLATE_600, TEXT_PRIMARY } from "@/constants/colors";
import { ProfileCoverHero } from "@/components/common/profile-cover-hero";
import { WalletTab } from "@/components/client/wallet-tab";
import { EmptyTab } from "@/components/client/empty-tab";

type TabName = "Wallet" | "Deliveries" | "Ratings";

const TABS: { name: TabName; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { name: "Wallet", icon: "account-balance-wallet" },
  { name: "Deliveries", icon: "local-shipping" },
  { name: "Ratings", icon: "star" },
];

export function DeliveryProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profileStats = useAppSelector((s) => s.auth.profileStats);
  const [activeTab, setActiveTab] = useState<TabName>("Wallet");
  const [optionsVisible, setOptionsVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getProfile()
      .then((res) => {
        if (res.success && res.data) {
          dispatch(updateUser(res.data.user));
          dispatch(setProfileStats({
            rating: res.data.rating,
            followersCount: res.data.followersCount,
            likesCount: res.data.likesCount ?? 0,
          }));
        }
      })
      .catch(() => {});
  }, [user?.id, dispatch]);

  const rating = profileStats?.rating?.average ?? 0;
  const ratingCount = profileStats?.rating?.count ?? 0;
  const deliveriesCompleted = user?.deliveriesCompleted ?? 0;
  const vehicleType = user?.vehicleType?.trim() || "Bike";
  const location = user?.city ?? null;

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Wallet":
        return <WalletTab />;
      case "Deliveries":
        return (
          <EmptyTab
            icon="local-shipping"
            title="My Deliveries"
            description="Your pending and completed deliveries will appear here. Accept courses from the Dashboard."
          />
        );
      case "Ratings":
        return (
          <EmptyTab
            icon="star-outline"
            title="My Ratings"
            description="Reviews and ratings from clients will appear here."
          />
        );
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <ProfileCoverHero
          avatarUri={user?.photo ?? null}
          coverUri={user?.coverPhoto ?? null}
          showAvailabilityDot
          topBar={{
            showBack: true,
            onBack: () => router.back(),
            onShare: () => {},
            onOptions: () => setOptionsVisible(true),
          }}
        >
          <Text style={s.name}>{user?.name ?? "Livreur"}</Text>
          <Text style={s.roleLocationLine}>
            {"LIVREUR • MaCake" + (location ? ` • ${location}` : "")}
          </Text>
          {user?.email ? (
            <View style={s.phoneRow}>
              <MaterialIcons name="email" size={12} color={SLATE_500} />
              <Text style={s.phoneText}>{user.email}</Text>
            </View>
          ) : null}

          {/* Stats row: same style as patissiere (rating, followers, deliveries) */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <MaterialIcons name="star" size={14} color="#eab308" />
              <Text style={s.statBold}>{Number(rating).toFixed(1)}</Text>
              <Text style={s.statMuted}>({ratingCount} reviews)</Text>
            </View>
            <View style={s.statDot} />
            <View style={s.statItem}>
              <Text style={s.statBold}>
                {(profileStats?.followersCount ?? 0) >= 1000
                  ? `${((profileStats?.followersCount ?? 0) / 1000).toFixed(1)}k`
                  : String(profileStats?.followersCount ?? 0)}
              </Text>
              <Text style={s.statMuted}>Followers</Text>
            </View>
            <View style={s.statDot} />
            <View style={s.statItem}>
              <Text style={s.statBold}>{deliveriesCompleted}</Text>
              <Text style={s.statMuted}>Livraisons</Text>
            </View>
          </View>

          {/* Vehicle */}
          <View style={s.metaRow}>
            <View style={s.metaChip}>
              <MaterialIcons name="two-wheeler" size={14} color={SLATE_600} />
              <Text style={s.metaText}>{vehicleType}</Text>
            </View>
          </View>

        </ProfileCoverHero>

        {/* Tabs */}
        <View style={s.tabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabsScroll}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => setActiveTab(tab.name)}
                  style={[s.tab, isActive && s.tabActive]}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={22}
                    color={isActive ? PRIMARY : SLATE_400}
                  />
                  <Text style={[s.tabText, isActive && s.tabTextActive]}>
                    {tab.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {renderTabContent()}

        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text style={s.logoutText}>Déconnexion</Text>
        </Pressable>

        <View style={s.bottomSpacer} />
      </ScrollView>

      <Modal visible={optionsVisible} transparent animationType="fade">
        <Pressable style={s.optionsBackdrop} onPress={() => setOptionsVisible(false)}>
          <Pressable style={s.optionsCard} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={s.optionRow}
              onPress={() => { setOptionsVisible(false); router.push("/edit-profile" as any); }}
            >
              <MaterialIcons name="edit" size={20} color={TEXT_PRIMARY} />
              <Text style={s.optionText}>Modifier le profil</Text>
            </Pressable>
            <Pressable
              style={s.optionRow}
              onPress={() => { setOptionsVisible(false); router.push("/settings" as any); }}
            >
              <MaterialIcons name="settings" size={20} color={TEXT_PRIMARY} />
              <Text style={s.optionText}>Paramètres</Text>
            </Pressable>
            <View style={s.optionDivider} />
            <Pressable
              style={s.optionRow}
              onPress={() => { setOptionsVisible(false); handleLogout(); }}
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={[s.optionText, { color: "#ef4444" }]}>Déconnexion</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
  },
  roleLocationLine: {
    fontSize: 14,
    fontWeight: "500",
    color: PRIMARY,
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  phoneText: { fontSize: 12, color: SLATE_500 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statBold: { fontSize: 13, fontWeight: "700", color: TEXT_PRIMARY },
  statMuted: { fontSize: 12, color: SLATE_500 },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SLATE_400,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
  },
  metaText: { fontSize: 12, fontWeight: "600", color: SLATE_600 },
  tabsWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginTop: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 24,
    flexDirection: "row",
    paddingVertical: 12,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: SLATE_400,
  },
  tabTextActive: { color: PRIMARY },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
  bottomSpacer: { height: 24 },
  optionsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  optionsCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionText: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY },
  optionDivider: { height: 1, backgroundColor: "#f1f5f9" },
});
