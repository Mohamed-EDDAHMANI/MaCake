import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { getProfile, setProfileStats, updateUser, logout } from "@/store/features/auth";
import { PRIMARY, TEXT_PRIMARY, SLATE_400, SLATE_500 } from "@/constants/colors";
import { ProfileCoverHero } from "@/components/common/profile-cover-hero";
import { ModifyProfileButton } from "@/components/common/ModifyProfileButton";

export function ProfileHero() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profileStats = useAppSelector((s) => s.auth.profileStats);
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

  const memberSince = user?.createdAt
    ? `Sweet tooth since ${new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
    : "MaCake member";

  return (
    <View>
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
        <Text className="text-2xl font-extrabold text-slate-900 mt-4 text-center">
          {user?.name ?? "User"}
        </Text>
        <Text className="text-sm font-medium mt-1.5 text-center" style={{ color: PRIMARY }}>
          {"CLIENT • MaCake" + (user?.city ? ` • ${user.city}` : " • Morocco")}
        </Text>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <MaterialIcons name="star" size={14} color="#eab308" />
            <Text style={s.statBold}>
              {profileStats != null ? Number(profileStats.rating.average).toFixed(1) : "0"}
            </Text>
            <Text style={s.statMuted}>
              ({profileStats != null ? profileStats.rating.count : 0} reviews)
            </Text>
          </View>
          <View style={s.statDot} />
          <View style={s.statItem}>
            <Text style={s.statBold}>
              {profileStats != null
                ? (profileStats.followersCount >= 1000
                  ? `${(profileStats.followersCount / 1000).toFixed(1)}k`
                  : String(profileStats.followersCount))
                : "0"}
            </Text>
            <Text style={s.statMuted}>Followers</Text>
          </View>
        </View>
        <Text className="text-sm font-medium text-slate-500 mt-1">{memberSince}</Text>
      </ProfileCoverHero>

      <ModifyProfileButton
        label="Modify Profile"
        onPress={() => router.push("/edit-profile" as any)}
      />

      <Modal visible={optionsVisible} transparent animationType="fade">
        <Pressable style={s.optionsBackdrop} onPress={() => setOptionsVisible(false)}>
          <Pressable style={s.optionsCard} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={s.optionRow}
              onPress={() => { setOptionsVisible(false); router.push("/edit-profile" as any); }}
            >
              <MaterialIcons name="edit" size={20} color={TEXT_PRIMARY} />
              <Text style={s.optionText}>Edit profile</Text>
            </Pressable>
            <Pressable
              style={s.optionRow}
              onPress={() => { setOptionsVisible(false); router.push("/settings" as any); }}
            >
              <MaterialIcons name="settings" size={20} color={TEXT_PRIMARY} />
              <Text style={s.optionText}>Settings</Text>
            </Pressable>
            <View style={s.optionDivider} />
            <Pressable
              style={s.optionRow}
              onPress={() => {
                setOptionsVisible(false);
                dispatch(logout());
                router.replace("/");
              }}
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={[s.optionText, { color: "#ef4444" }]}>Log out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
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
