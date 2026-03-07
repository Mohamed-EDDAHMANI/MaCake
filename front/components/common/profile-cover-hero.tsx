import { ReactNode } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { PRIMARY, PRIMARY_TINT, BACKGROUND_LIGHT, SURFACE } from "@/constants/colors";
import { buildPhotoUrl } from "@/lib/utils";

const COVER_HEIGHT = 200;
const AVATAR_SIZE = 112;

const DEFAULT_COVER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB4LmExY8RmRYcaIsAzzhQV2yzeVmUKwyBc5_wHqq4aGJQeET1Y7JLuGUPeNSc75CcDyye3PZY2pLdT7Wc23f98W82O_gshMP0schcz-4UjJP-MNr020xayqg670kpPQZncMCVm4Kt9Xkw_awkKKDW6aX-xaOgbWS0sUSDMUkbavd0mIivb9kIp1wAMWHa4tm1DdUrmct6butv_jLdz2Xcq6S8yOt2hV6KJiYZ3M25IqLKI2RYKhlxwLbmE6Z3rRTcf6atdza9eZeEe";

export interface ProfileCoverHeroProps {
  /** User profile photo (avatar) */
  avatarUri?: string | null;
  /** Cover/banner image. If null, uses default. */
  coverUri?: string | null;
  /** Show verified badge on avatar */
  showVerifiedBadge?: boolean;
  /** When set, avatar is pressable (e.g. edit profile) */
  onAvatarPress?: () => void;
  /** Content below the avatar (name, location, buttons, etc.) */
  children?: ReactNode;
}

/**
 * Reusable profile header: cover image + overlapping avatar (profile pic).
 * Use on all profile screens for a consistent look.
 */
export function ProfileCoverHero({
  avatarUri,
  coverUri,
  showVerifiedBadge = false,
  onAvatarPress,
  children,
}: ProfileCoverHeroProps) {
  const cover = coverUri ? buildPhotoUrl(coverUri) : null;
  const avatar = avatarUri
    ? avatarUri.startsWith("http") || avatarUri.startsWith("file")
      ? avatarUri
      : buildPhotoUrl(avatarUri)
    : null;

  const AvatarWrap = onAvatarPress ? Pressable : View;
  const avatarWrapProps = onAvatarPress ? { onPress: onAvatarPress } : {};

  return (
    <View style={styles.wrap}>
      {/* Cover */}
      <View style={styles.coverWrap}>
        <Image
          source={{ uri: cover || DEFAULT_COVER }}
          style={styles.coverImg}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "transparent", BACKGROUND_LIGHT]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Profile block: avatar overlapping cover + optional children */}
      <View style={styles.profileBlock}>
        <AvatarWrap style={styles.avatarRing} {...avatarWrapProps}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={48} color={PRIMARY} />
            </View>
          )}
          {showVerifiedBadge ? (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={14} color="#fff" />
            </View>
          ) : null}
        </AvatarWrap>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  coverWrap: {
    width: "100%",
    height: COVER_HEIGHT,
    backgroundColor: PRIMARY_TINT,
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%" },
  profileBlock: {
    marginTop: -AVATAR_SIZE / 2,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 10,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: SURFACE,
    overflow: "hidden",
    backgroundColor: SURFACE,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_TINT,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
});
