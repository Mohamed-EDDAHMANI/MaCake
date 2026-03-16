import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { logout, getProfile, setProfileStats, updateUser } from "@/store/features/auth";
import type { Product } from "@/store/features/catalog";
import { toggleLike } from "@/store/features/catalog";
import { toggleFollow } from "@/store/features/follow";
import { toggleProfileLike } from "@/store/features/profileLike";
import { getPatissiereOrdersApi } from "@/store/features/order/orderApi";
import { buildPhotoUrl, getProductDetailPath } from "@/lib/utils";
import { getRatingSocket, type RatingCreatedPayload } from "@/lib/rating-socket";
import { WalletTab } from "@/components/client/wallet-tab";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SLATE_700,
  SLATE_800,
  SURFACE,
  BORDER,
  BORDER_SUBTLE,
  PRIMARY_TINT,
  TEXT_PRIMARY,
} from "@/constants/colors";

const COVER_HEIGHT = 256;
const AVATAR_SIZE = 128;
const PATISSIERE_TABS = [
  { name: "Portfolio" as const, icon: "photo-library" as const },
  { name: "Wallet" as const, icon: "account-balance-wallet" as const },
  { name: "Reviews" as const, icon: "star" as const },
  { name: "Services" as const, icon: "miscellaneous-services" as const },
];
type PatissiereTabName = (typeof PATISSIERE_TABS)[number]["name"];

// Placeholder cover and portfolio images (matching HTML style)
const DEFAULT_COVER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB4LmExY8RmRYcaIsAzzhQV2yzeVmUKwyBc5_wHqq4aGJQeET1Y7JLuGUPeNSc75CcDyye3PZY2pLdT7Wc23f98W82O_gshMP0schcz-4UjJP-MNr020xayqg670kpPQZncMCVm4Kt9Xkw_awkKKDW6aX-xaOgbWS0sUSDMUkbavd0mIivb9kIp1wAMWHa4tm1DdUrmct6butv_jLdz2Xcq6S8yOt2hV6KJiYZ3M25IqLKI2RYKhlxwLbmE6Z3rRTcf6atdza9eZeEe";

function productImageUri(product: Product): string | null {
  const raw = product.images?.[0];
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return buildPhotoUrl(raw);
}

interface ProfileContentProps {
  menuItems?: Array<{ icon: string; label: string; onPress?: () => void }>;
  /** When provided, the screen shows another user's profile. */
  viewedUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    photo?: string | null;
    coverPhoto?: string | null;
    description?: string | null;
  } | null;
  /** Stats for viewed user (rating + followers). Use when profile was loaded via getProfileById. */
  viewedUserStats?: { rating: { average: number; count: number }; followersCount: number } | null;
  /** Force showing/hiding the back button. Default: show only for other users. */
  showBack?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 2;
const GRID_PADDING = 8;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

export function ProfileContent({ menuItems = [], viewedUser, viewedUserStats, showBack }: ProfileContentProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showAuthModal } = useAuthModal();
  const authUser = useAppSelector((state) => state.auth.user);
  const profileStats = useAppSelector((state) => state.auth.profileStats);
  const profileUser = viewedUser ?? authUser;
  const allProducts = useAppSelector((state) => state.catalog.products);
  const followStatus = useAppSelector((state) =>
    viewedUser?.id ? state.follow.statusByPatissiere[viewedUser.id] : undefined
  );
  const followLoading = useAppSelector((state) => state.follow.followLoading);
  const profileLikeStatus = useAppSelector((state) =>
    viewedUser?.id ? state.profileLike.statusByPatissiere[viewedUser.id] : undefined
  );
  const profileLikeLoading = useAppSelector(
    (state) => state.profileLike.profileLikeLoading
  );
  const portfolioProducts = useMemo(() => {
    const uid = profileUser?.id;
    if (!uid) return [];
    return allProducts.filter(
      (p) => (p.patissiereId ?? p.patissiere?.id) === uid
    );
  }, [allProducts, profileUser?.id]);

  // Fetch own profile (user + rating + followers) when viewing own profile
  const [profileLoading, setProfileLoading] = useState(false);
  const fetchOwnProfile = async () => {
    if (!authUser?.id) return;
    setProfileLoading(true);
    try {
      const res = await getProfile();
      if (res.success && res.data) {
        dispatch(updateUser(res.data.user));
        dispatch(
          setProfileStats({
            rating: res.data.rating,
            followersCount: res.data.followersCount,
            likesCount: res.data.likesCount ?? 0,
          }),
        );
      }
    } catch {
      // Keep existing profileStats on error
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!viewedUser && authUser?.id) {
      fetchOwnProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchOwnProfile is stable
  }, [viewedUser, authUser?.id]);

  // Real-time: refetch own profile stats when a rating is created for current user
  useEffect(() => {
    const authId = authUser?.id;
    if (!authId) return;
    const socket = getRatingSocket();
    const handler = (payload: RatingCreatedPayload) => {
      if (payload.toUserId === authId) fetchOwnProfile();
    };
    socket.on("rating.created", handler);
    return () => {
      socket.off("rating.created", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchOwnProfile in handler is intentional
  }, [authUser?.id]);

  const isOwnProfile = useMemo(() => {
    const a = authUser?.id;
    const p = profileUser?.id;
    if (!a || !p) return true;
    return a === p;
  }, [authUser?.id, profileUser?.id]);

  const effectiveShowBack = showBack ?? !isOwnProfile;

  const userPhoto = buildPhotoUrl(profileUser?.photo ?? null);
  const coverPhoto = buildPhotoUrl(profileUser?.coverPhoto ?? null);

  const [activeTab, setActiveTab] = useState<PatissiereTabName>("Portfolio");
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [ordersCount, setOrdersCount] = useState<number>(0);

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/");
  };

  const roleLabel = profileUser?.role ? String(profileUser.role).replace(/_/g, " ") : "";
  const isPatissiereProfile = String(profileUser?.role ?? "").toUpperCase() === "PATISSIERE";
  const subtitle = [roleLabel, "MaCake", profileUser?.city ?? null].filter(Boolean).join(" • ");

  useEffect(() => {
    if (!isOwnProfile || !isPatissiereProfile || !authUser?.id) return;
    getPatissiereOrdersApi()
      .then((orders) => setOrdersCount(orders?.length ?? 0))
      .catch(() => setOrdersCount(0));
  }, [isOwnProfile, isPatissiereProfile, authUser?.id]);

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover + overlay */}
        <View style={styles.coverWrap}>
          <Image
            source={{ uri: coverPhoto || DEFAULT_COVER }}
            style={styles.coverImg}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", BACKGROUND_LIGHT]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Top bar */}
          <View style={styles.topBar}>
            {effectiveShowBack ? (
              <Pressable onPress={() => router.back()} style={styles.glassBtn}>
                <BlurView
                  intensity={80}
                  tint="light"
                  style={styles.glassBtnInner}
                  {...(Platform.OS === "android"
                    ? { experimentalBlurMethod: "dimezisBlurView" as const }
                    : {})}
                >
                  <MaterialIcons name="arrow-back" size={22} color="#fff" />
                </BlurView>
              </Pressable>
            ) : (
              <View style={{ width: 40, height: 40 }} />
            )}
            <View style={styles.topBarRight}>
              <Pressable style={styles.glassBtn}>
                <BlurView intensity={80} tint="light" style={styles.glassBtnInner} {...(Platform.OS === "android" ? { experimentalBlurMethod: "dimezisBlurView" as const } : {})}>
                  <MaterialIcons name="share" size={22} color="#fff" />
                </BlurView>
              </Pressable>
              <Pressable style={styles.glassBtn} onPress={() => setOptionsVisible(true)}>
                <BlurView intensity={80} tint="light" style={styles.glassBtnInner} {...(Platform.OS === "android" ? { experimentalBlurMethod: "dimezisBlurView" as const } : {})}>
                  <MaterialIcons name="more-horiz" size={22} color="#fff" />
                </BlurView>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Profile block (overlap) */}
        <View style={styles.profileBlock}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarRing}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={56} color={PRIMARY} />
                </View>
              )}
            </View>
            {isOwnProfile ? <View style={styles.availabilityDot} /> : null}
          </View>
          <Text style={styles.name}>{profileUser?.name ?? "User"}</Text>
          <Text style={styles.subtitle}>{subtitle || profileUser?.email}</Text>
          <View style={styles.statsRow}>
            {profileLoading ? (
              <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 4 }} />
            ) : (
              <>
                <View style={styles.statItem}>
                  <MaterialIcons name="star" size={14} color="#eab308" />
                  <Text style={styles.statBold}>
                    {isOwnProfile && profileStats != null
                      ? Number(profileStats.rating.average).toFixed(1)
                      : viewedUserStats
                        ? Number(viewedUserStats.rating.average).toFixed(1)
                        : "0"}
                  </Text>
                  <Text style={styles.statMuted}>
                    ({isOwnProfile && profileStats != null
                      ? profileStats.rating.count
                      : viewedUserStats
                        ? viewedUserStats.rating.count
                        : 0} reviews)
                  </Text>
                </View>
                <View style={styles.statDot} />
                <View style={styles.statItem}>
                  <Text style={styles.statBold}>
                    {(() => {
                      const count =
                        viewedUser?.id && followStatus != null
                          ? followStatus.count
                          : isOwnProfile && profileStats != null
                            ? profileStats.followersCount
                            : viewedUserStats?.followersCount ?? 0;
                      return count >= 1000
                        ? `${(count / 1000).toFixed(1)}k`
                        : String(count);
                    })()}
                  </Text>
                  <Text style={styles.statMuted}>Followers</Text>
                </View>
                {isPatissiereProfile ? (
                  <>
                    <View style={styles.statDot} />
                    <View style={styles.statItem}>
                      <Text style={styles.statBold}>
                        {ordersCount >= 1000 ? `${(ordersCount / 1000).toFixed(1)}k` : String(ordersCount)}
                      </Text>
                      <Text style={styles.statMuted}>Orders</Text>
                    </View>
                  </>
                ) : null}
              </>
            )}
          </View>

          {/* Bio right after rating */}
          <View style={styles.bioSection}>
            {profileUser?.description ? (
              <Text style={styles.bio}>{profileUser.description}</Text>
            ) : isOwnProfile ? (
              <Text style={styles.bioPlaceholder}>Add a bio in Edit profile</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>No bio yet</Text>
            )}
          </View>

          {/* Follow / Like profile / Message buttons after bio */}
          {!isOwnProfile && viewedUser?.id ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.followBtn, followStatus?.following && styles.followBtnFollowing]}
                onPress={() => dispatch(toggleFollow(viewedUser.id))}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={followStatus?.following ? SLATE_700 : "#fff"}
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name={followStatus?.following ? "check" : "person-add"}
                      size={20}
                      color={followStatus?.following ? SLATE_700 : "#fff"}
                    />
                    <Text
                      style={[
                        styles.followBtnText,
                        followStatus?.following && styles.followBtnTextFollowing,
                      ]}
                    >
                      {followStatus?.following ? "Following" : "Follow"}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.likeProfileBtn,
                  profileLikeStatus?.liked && styles.likeProfileBtnLiked,
                ]}
                onPress={() => {
                  if (!authUser) {
                    showAuthModal();
                    return;
                  }
                  dispatch(toggleProfileLike(viewedUser.id));
                }}
                disabled={profileLikeLoading}
              >
                {profileLikeLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={profileLikeStatus?.liked ? "#fff" : SLATE_600}
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name={profileLikeStatus?.liked ? "favorite" : "favorite-border"}
                      size={20}
                      color={profileLikeStatus?.liked ? "#fff" : SLATE_600}
                    />
                    <Text
                      style={[
                        styles.likeProfileBtnText,
                        profileLikeStatus?.liked && styles.likeProfileBtnTextLiked,
                      ]}
                    >
                      {profileLikeStatus?.liked ? "Liked" : "Like"}
                    </Text>
                    {profileLikeStatus?.count != null && profileLikeStatus.count > 0 ? (
                      <Text
                        style={[
                          styles.likeProfileCountText,
                          profileLikeStatus?.liked && styles.likeProfileCountTextLiked,
                        ]}
                      >
                        {profileLikeStatus.count}
                      </Text>
                    ) : null}
                  </>
                )}
              </Pressable>
              <Pressable style={styles.messageBtn}>
                <MaterialIcons name="mail-outline" size={20} color={TEXT_PRIMARY} />
                <Text style={styles.messageBtnText}>Message</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Tabs: Portfolio, Wallet, Reviews (with icons) */}
        <View style={styles.tabsWrap}>
          {PATISSIERE_TABS.map(({ name, icon }) => {
            const isActive = activeTab === name;
            return (
              <Pressable
                key={name}
                onPress={() => setActiveTab(name)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <MaterialIcons
                  name={icon}
                  size={22}
                  color={isActive ? PRIMARY : SLATE_400}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab content: Portfolio = grid, Wallet = wallet, Reviews/Services = placeholder */}
        {activeTab === "Wallet" ? (
          <WalletTab />
        ) : activeTab === "Portfolio" ? (
        <View style={styles.gridWrap}>
          {portfolioProducts.length === 0 ? (
            <Text style={styles.portfolioEmpty}>
              {isOwnProfile ? "No products yet. Add some in Create." : "No portfolio items."}
            </Text>
          ) : (
            portfolioProducts.map((product) => {
              const uri = productImageUri(product);
              const isLiked = authUser?.id && (product.likedByUserIds ?? []).includes(authUser.id);
              return (
                <Pressable
                  key={product.id}
                  style={styles.gridItem}
                  onPress={() => router.push(getProductDetailPath(product.id) as any)}
                >
                  <Image
                    source={{ uri: uri ?? undefined }}
                    style={styles.gridImg}
                    contentFit="cover"
                  />
                  <View style={styles.gridPriceBadge}>
                    <Text style={styles.gridPriceText}>
                      {product.price != null ? `€${Number(product.price).toFixed(2)}` : "—"}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.gridFav}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!authUser) return;
                      dispatch(toggleLike(product.id));
                    }}
                  >
                    <MaterialIcons
                      name="favorite"
                      size={12}
                      color={isLiked ? PRIMARY : "#fff"}
                    />
                    <Text style={styles.gridFavCount}>
                      {product.likesCount != null && product.likesCount >= 1000
                        ? `${(product.likesCount / 1000).toFixed(1)}k`
                        : String(product.likesCount ?? 0)}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </View>
        ) : (
          <View style={styles.aboutTabContent}>
            <Text style={styles.portfolioEmpty}>
              {activeTab === "Reviews" ? "Reviews coming soon" : "Services coming soon"}
            </Text>
          </View>
        )}

        {/* Log out (optional quick action for own profile) */}
        {isOwnProfile && !isPatissiereProfile ? (
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={22} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Options modal (three dots) */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable style={styles.optionsBackdrop} onPress={() => setOptionsVisible(false)}>
          <Pressable style={styles.optionsCard} onPress={(e) => e.stopPropagation()}>
            {isOwnProfile ? (
              <>
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    setOptionsVisible(false);
                    router.push("/edit-profile" as any);
                  }}
                >
                  <MaterialIcons name="edit" size={20} color={TEXT_PRIMARY} />
                  <Text style={styles.optionText}>Edit profile</Text>
                </Pressable>
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    setOptionsVisible(false);
                    router.push("/settings" as any);
                  }}
                >
                  <MaterialIcons name="settings" size={20} color={TEXT_PRIMARY} />
                  <Text style={styles.optionText}>Settings</Text>
                </Pressable>
                {!isPatissiereProfile ? (
                  <>
                    <View style={styles.optionDivider} />
                    <Pressable
                      style={styles.optionRow}
                      onPress={() => {
                        setOptionsVisible(false);
                        handleLogout();
                      }}
                    >
                      <MaterialIcons name="logout" size={20} color="#ef4444" />
                      <Text style={[styles.optionText, { color: "#ef4444" }]}>Log out</Text>
                    </Pressable>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Pressable style={styles.optionRow} onPress={() => setOptionsVisible(false)}>
                  <MaterialIcons name="share" size={20} color={TEXT_PRIMARY} />
                  <Text style={styles.optionText}>Share profile</Text>
                </Pressable>
                <Pressable style={styles.optionRow} onPress={() => setOptionsVisible(false)}>
                  <MaterialIcons name="flag" size={20} color={TEXT_PRIMARY} />
                  <Text style={styles.optionText}>Report</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BACKGROUND_LIGHT },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  coverWrap: {
    height: COVER_HEIGHT,
    width: "100%",
    overflow: "hidden",
  },
  coverImg: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 12,
    zIndex: 10,
  },
  glassBtn: {
    borderRadius: 9999,
    overflow: "hidden",
  },
  glassBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  topBarRight: { flexDirection: "row", gap: 8 },
  profileBlock: {
    marginTop: -64,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 20,
  },
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: "relative",
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: SURFACE,
    overflow: "hidden",
    backgroundColor: SURFACE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_TINT,
  },
  availabilityDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    borderWidth: 2.5,
    borderColor: SURFACE,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: PRIMARY,
    marginTop: 4,
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
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 0,
  },
  followBtn: {
    flex: 1,
    height: 44,
    backgroundColor: PRIMARY,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  followBtnFollowing: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  followBtnTextFollowing: { color: SLATE_700, fontWeight: "600" },
  likeProfileBtn: {
    flex: 1,
    height: 44,
    backgroundColor: BORDER_SUBTLE,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  likeProfileBtnLiked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  likeProfileBtnText: { fontSize: 15, fontWeight: "600", color: SLATE_600 },
  likeProfileBtnTextLiked: { color: "#fff", fontWeight: "600" },
  likeProfileCountText: { fontSize: 13, fontWeight: "700", color: SLATE_600 },
  likeProfileCountTextLiked: { color: "#fff", fontWeight: "700" },
  messageBtn: {
    flex: 1,
    height: 44,
    backgroundColor: BORDER_SUBTLE,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  messageBtnText: { fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY },
  bioSection: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  bio: {
    marginTop: 0,
    fontSize: 14,
    color: SLATE_600,
    textAlign: "center",
    lineHeight: 22,
  },
  bioPlaceholder: {
    marginTop: 0,
    fontSize: 14,
    color: SLATE_500,
    textAlign: "center",
    fontStyle: "italic",
  },
  aboutTabContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  aboutLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  aboutBio: {
    fontSize: 15,
    color: SLATE_600,
    lineHeight: 24,
  },
  aboutBioEmpty: {
    fontSize: 14,
    color: SLATE_500,
    fontStyle: "italic",
  },
  tabsWrap: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 32,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: "500", color: SLATE_400 },
  tabTextActive: { fontWeight: "700", color: PRIMARY },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: GRID_GAP / 2,
    marginTop: 8,
    paddingHorizontal: GRID_PADDING,
  },
  portfolioEmpty: {
    width: "100%",
    paddingVertical: 24,
    fontSize: 14,
    color: SLATE_500,
    textAlign: "center",
  },
  gridItem: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: GRID_GAP / 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridImg: { width: "100%", height: "100%" },
  gridPriceBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridPriceText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  gridFav: {
    position: "absolute",
    top: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  gridFavCount: { fontSize: 10, fontWeight: "700", color: "#fff" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
  optionsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingRight: 16,
  },
  optionsCard: {
    width: 220,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  optionDivider: {
    height: 1,
    backgroundColor: BORDER_SUBTLE,
  },
});
