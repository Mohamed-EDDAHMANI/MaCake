import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { PRIMARY } from "@/constants/colors";
import { ProfileCoverHero } from "@/components/common/profile-cover-hero";

export function ProfileHero() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);

  const memberSince = user?.createdAt
    ? `Sweet tooth since ${new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
    : "MaCack member";

  return (
    <View>
      <ProfileCoverHero
        avatarUri={user?.photo ?? null}
        coverUri={user?.coverPhoto ?? null}
        showVerifiedBadge
      >
        <Text className="text-2xl font-extrabold text-slate-900 mt-4 text-center">
          {user?.name ?? "User"}
        </Text>
        <View className="flex-row items-center gap-1 mt-1.5">
          <MaterialIcons name="location-on" size={14} color={`${PRIMARY}B3`} />
          <Text className="text-sm font-medium" style={{ color: `${PRIMARY}B3` }}>Morocco</Text>
        </View>
        <Text className="text-sm font-medium text-slate-500 mt-1">{memberSince}</Text>
      </ProfileCoverHero>

      {/* Modify Profile Button */}
      <View className="px-6 pb-6 bg-white border-b border-background-light">
        <Pressable
          className="flex-row items-center justify-center h-12 rounded-xl gap-2"
          style={[{ backgroundColor: PRIMARY }, s.shadow]}
          onPress={() => router.push("/edit-profile" as any)}
        >
          <MaterialIcons name="edit" size={18} color="#fff" />
          <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.3 }}>Modify Profile</Text>
        </Pressable>
      </View>
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
});
