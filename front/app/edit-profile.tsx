import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { updateUser, updateProfile } from "@/store/features/auth";
import { buildPhotoUrl } from "@/lib/utils";
import { PRIMARY, SLATE_400, TEXT_PRIMARY, PRIMARY_TINT } from "@/constants/colors";
import { ProfileCoverHero } from "@/components/common/profile-cover-hero";

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const photo = buildPhotoUrl(user?.photo ?? null);

  /* ─── form state ─── */
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [description, setDescription] = useState(user?.description ?? "");
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayPhoto = localPhoto ?? photo;

  console.log(user?.phone)

  /* ─── image picker ─── */
  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Gallery access is needed to change your profile picture.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalPhoto(result.assets[0].uri);
    }
  }, []);

  /* ─── save handler ─── */
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setErrorMsg(null);

    const payload: Record<string, any> = {};
    if (name.trim() && name.trim() !== user?.name) payload.name = name.trim();
    if (email.trim() && email.trim() !== user?.email) payload.email = email.trim().toLowerCase();
    if (phone.trim() !== (user?.phone ?? "")) payload.phone = phone.trim() || null;
    if (city.trim() !== (user?.city ?? "")) payload.city = city.trim() || null;
    if (address.trim() !== (user?.address ?? "")) payload.address = address.trim() || null;
    if (description.trim() !== (user?.description ?? "")) payload.description = description.trim() || null;
    if (localPhoto) payload.photo = localPhoto;

    if (Object.keys(payload).length === 0) {
      // Nothing changed
      router.back();
      return;
    }

    try {
      const response = await updateProfile(payload);
      if (response.success && response.data?.user) {
        dispatch(updateUser(response.data.user));
      } else {
        // Still update locally with what we have
        const { photo: _ph, ...localFields } = payload;
        dispatch(updateUser(localFields));
      }
      router.back();
    } catch (err: any) {
      // API may not exist yet — save locally for now
      const { photo: _ph, ...localFields } = payload;
      dispatch(updateUser(localFields));
      router.back();
    } finally {
      setSaving(false);
    }
  };

  /* ─── formatted "member since" ─── */
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  /* ─── render ─── */
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <Pressable className="w-10 h-10 items-center justify-center" onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color={TEXT_PRIMARY} />
        </Pressable>
        <Text className="text-lg font-bold text-slate-900 flex-1 text-center">Edit Profile</Text>
        <Pressable
          className="px-3.5 py-2 rounded-lg"
          style={{ backgroundColor: `${PRIMARY}0F` }}
          onPress={() => router.back()}
        >
          <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>Cancel</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover + profile pic (tap avatar to change) */}
          <ProfileCoverHero
            avatarUri={localPhoto ?? user?.photo ?? null}
            coverUri={user?.coverPhoto ?? null}
            onAvatarPress={pickPhoto}
          >
            <Pressable onPress={pickPhoto} className="mt-4">
              <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>Change Profile Picture</Text>
            </Pressable>
          </ProfileCoverHero>

          {/* Form Fields */}
          <View className="px-6 gap-5">
            {/* Full Name */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-900"
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={SLATE_400}
              />
            </View>

            {/* Email */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-900"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={SLATE_400}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-900"
                value={phone}
                onChangeText={setPhone}
                placeholder="+212 600 000 000"
                placeholderTextColor={SLATE_400}
                keyboardType="phone-pad"
              />
            </View>

            {/* City */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">City</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-900"
                value={city}
                onChangeText={setCity}
                placeholder="Your city"
                placeholderTextColor={SLATE_400}
              />
            </View>

            {/* Address */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-900"
                value={address}
                onChangeText={setAddress}
                placeholder="Street address"
                placeholderTextColor={SLATE_400}
              />
            </View>

            {/* About Me */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">About Me</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 pt-3.5 pb-3.5 text-[15px] font-medium text-slate-900 min-h-[90px]"
                style={{ textAlignVertical: "top" }}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell us about yourself..."
                placeholderTextColor={SLATE_400}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Status & Member Since */}
            <View className="pt-6 border-t border-slate-100 gap-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-sm font-medium text-slate-600">
                  Status: <Text className="font-bold text-slate-900">{user?.status === "suspended" ? "Suspended" : "Active"}</Text>
                </Text>
              </View>
              {memberSince && (
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="calendar-today" size={14} color={SLATE_400} />
                  <Text className="text-sm font-medium text-slate-600">
                    Member since <Text className="font-bold text-slate-900">{memberSince}</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Error message */}
            {errorMsg && (
              <View className="bg-red-50 rounded-lg p-3">
                <Text className="text-sm text-red-700">{errorMsg}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Save Button */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-slate-100 p-6"
        style={[styles.bottomBar, { paddingBottom: Platform.OS === "ios" ? 36 : 24 }]}
      >
        <Pressable
          className="flex-row items-center justify-center h-14 rounded-2xl gap-2"
          style={[{ backgroundColor: PRIMARY }, styles.saveShadow]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text className="text-base font-bold text-white">Save Changes</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ─── styles that NativeWind can't handle (shadows, rgba bg) ─── */
const styles = StyleSheet.create({
  bottomBar: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  saveShadow: {
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

