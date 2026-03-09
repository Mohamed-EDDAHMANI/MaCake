/**
 * App sidebar / drawer — left side, opens left-to-right.
 * Uses app colors from @/constants/colors.
 */
import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/features/auth";
import {
  PRIMARY,
  CREAM,
  TEXT_PRIMARY,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SLATE_700,
  BORDER,
  BORDER_SUBTLE,
  SURFACE,
  PRIMARY_05,
  PRIMARY_10,
  PRIMARY_20,
} from "@/constants/colors";
import { buildPhotoUrl } from "@/lib/utils";
import type { UserRole } from "@/store/features/auth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.85);

const DANGER = "#ef4444";
const DANGER_BG = "#fef2f2";

interface SidebarItem {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: boolean;
  rightText?: string;
}

interface AppSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export function AppSidebar({ visible, onClose }: AppSidebarProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role: UserRole | undefined = user?.role;
  const walletBalance = user?.walletBalance ?? 0;

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          delay: 120,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-DRAWER_WIDTH);
      overlayOpacity.setValue(0);
      contentOpacity.setValue(0);
    }
  }, [visible]);

  const runCloseAnimation = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      callback?.();
    });
  };

  const navigateAndClose = (fn: () => void) => {
    runCloseAnimation(() => setTimeout(fn, 50));
  };

  const handleLogout = () => {
    runCloseAnimation(() => dispatch(logout()));
  };

  const handleClose = () => {
    runCloseAnimation();
  };

  const profilePhoto = buildPhotoUrl(user?.photo);

  const commonItems: SidebarItem[] = [
    {
      icon: "shopping-bag",
      label: "My Orders",
      onPress: () => navigateAndClose(() => router.push("/(main)/(tabs)/orders" as any)),
    },
    {
      icon: "chat-bubble-outline",
      label: "Messages",
      onPress: () => {
        if (role === "PATISSIERE") {
          navigateAndClose(() => router.push("/(patissiere)/messages" as any));
        } else {
          navigateAndClose(() => router.push("/(main)/(tabs)/search" as any));
        }
      },
      badge: true,
    },
    {
      icon: "favorite-border",
      label: "My Favorites",
      onPress: () => navigateAndClose(() => router.push("/(main)/(tabs)/favorites" as any)),
    },
    {
      icon: "account-balance-wallet",
      label: "Wallet",
      onPress: () => navigateAndClose(() => router.push("/(main)/(tabs)/profile" as any)),
      rightText: user?.role === "CLIENT" ? `${walletBalance.toFixed(2)} MAD` : undefined,
    },
  ];

  const roleDashboardItem: SidebarItem | null =
    role === "PATISSIERE"
      ? {
          icon: "restaurant",
          label: "Pastry Chef Dashboard",
          onPress: () => navigateAndClose(() => router.replace("/(patissiere)" as any)),
        }
      : role === "LIVREUR"
        ? {
            icon: "local-shipping",
            label: "Livreur Dashboard",
            onPress: () => navigateAndClose(() => router.replace("/(livreur)" as any)),
          }
        : role === "ADMIN" || role === "MANAGER" || role === "SUPER_ADMIN"
          ? {
              icon: "admin-panel-settings",
              label: "Admin Panel",
              onPress: () => navigateAndClose(() => router.push("/(main)/(tabs)/profile" as any)),
            }
          : null;

  const bottomItems: SidebarItem[] = [
    {
      icon: "settings",
      label: "Settings",
      onPress: () => navigateAndClose(() => router.push("/settings")),
    },
    {
      icon: "help-outline",
      label: "Help & Support",
      onPress: () => navigateAndClose(() => router.push("/settings")),
    },
  ];

  const getRoleLabel = (r?: UserRole) => {
    switch (r) {
      case "PATISSIERE": return "Pastry Chef";
      case "LIVREUR": return "Delivery Driver";
      case "ADMIN": return "Administrator";
      case "MANAGER": return "Manager";
      case "SUPER_ADMIN": return "Super Admin";
      case "CLIENT": return "Customer";
      default: return "Guest";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Dark overlay backdrop */}
        <Animated.View style={[styles.backdropFill, { opacity: overlayOpacity }]} />

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Subtle top edge glow */}
          <View style={styles.topGlow} pointerEvents="none" />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: contentOpacity }}>
              {/* ── Profile Header ── */}
              <View style={styles.profileSection}>
                {/* Close button top-right */}
                <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
                  <MaterialIcons name="close" size={18} color={SLATE_600} />
                </Pressable>

                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarRing}>
                    {profilePhoto ? (
                      <Image source={{ uri: profilePhoto }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <MaterialIcons name="person" size={34} color={PRIMARY} />
                      </View>
                    )}
                  </View>
                  {/* Online indicator */}
                  <View style={styles.onlineDot} />
                </View>

                {/* Name + role */}
                <Text style={styles.profileName} numberOfLines={1}>
                  {user?.name ?? "Guest"}
                </Text>
                <View style={styles.rolePill}>
                  <Text style={styles.roleLabel}>{getRoleLabel(role)}</Text>
                </View>

                {/* View Profile link */}
                <Pressable
                  style={({ pressed }) => [
                    styles.viewProfileBtn,
                    pressed && styles.viewProfileBtnPressed,
                  ]}
                  onPress={() =>
                    navigateAndClose(() => router.push("/(main)/(tabs)/profile" as any))
                  }
                >
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </Pressable>
              </View>

              {/* ── Divider ── */}
              <View style={styles.sectionDivider} />

              {/* ── Main Nav ── */}
              <View style={styles.nav}>
                <Text style={styles.sectionLabel}>MENU</Text>
                {commonItems.map((item, i) => (
                  <NavItem key={item.label} item={item} index={i} />
                ))}
              </View>

              {/* ── Role Dashboard ── */}
              {roleDashboardItem && (
                <>
                  <View style={styles.sectionDivider} />
                  <View style={styles.nav}>
                    <Text style={styles.sectionLabel}>DASHBOARD</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.roleItem,
                        pressed && styles.roleItemPressed,
                      ]}
                      onPress={roleDashboardItem.onPress}
                    >
                      <View style={styles.roleIconWrap}>
                        <MaterialIcons
                          name={roleDashboardItem.icon as any}
                          size={20}
                          color={PRIMARY}
                        />
                      </View>
                      <Text style={styles.roleItemLabel}>{roleDashboardItem.label}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* ── Bottom Items ── */}
              <View style={styles.sectionDivider} />
              <View style={styles.nav}>
                <Text style={styles.sectionLabel}>SUPPORT</Text>
                {bottomItems.map((item, i) => (
                  <NavItem key={item.label} item={item} index={i} subtle />
                ))}
              </View>
            </Animated.View>
          </ScrollView>

          {/* ── Footer: Logout ── */}
          {isAuthenticated && (
            <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
              <View style={styles.footerDivider} />
              <Pressable
                style={({ pressed }) => [
                  styles.logoutBtn,
                  pressed && styles.logoutBtnPressed,
                ]}
                onPress={handleLogout}
              >
                <View style={styles.logoutIconWrap}>
                  <MaterialIcons name="logout" size={18} color={DANGER} />
                </View>
                <Text style={styles.logoutLabel}>Log Out</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        {/* Tap-to-close overlay (right side) */}
        <Animated.View style={[styles.overlayTouch, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Sub-component: NavItem ───────────────────────────────────────────────────
interface NavItemProps {
  item: SidebarItem;
  index: number;
  subtle?: boolean;
}
function NavItem({ item, subtle }: NavItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.navItem,
        pressed && styles.navItemPressed,
      ]}
      onPress={item.onPress}
    >
      <View style={styles.navItemLeft}>
        {/* Icon wrap */}
        <View style={[styles.navIconWrap, subtle && styles.navIconWrapSubtle]}>
          <MaterialIcons
            name={item.icon as any}
            size={19}
            color={subtle ? SLATE_600 : PRIMARY}
          />
          {item.badge && <View style={styles.badgeDot} />}
        </View>
        <Text style={[styles.navLabel, subtle && styles.navLabelSubtle]}>
          {item.label}
        </Text>
      </View>

      {item.rightText ? (
        <View style={styles.walletChip}>
          <Text style={styles.walletChipText}>{item.rightText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlayTouch: {
    flex: 1,
  },

  // ── Drawer shell ──
  drawer: {
    height: "100%",
    backgroundColor: CREAM,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
    paddingTop: 24,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: PRIMARY,
    opacity: 0.25,
    zIndex: 10,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // ── Profile section ──
  profileSection: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
  },
  avatarPlaceholder: {
    backgroundColor: PRIMARY_05,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: CREAM,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: PRIMARY_10,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: SLATE_400,
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: SLATE_600,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: PRIMARY_05,
    borderWidth: 1,
    borderColor: BORDER,
  },
  viewProfileBtnPressed: {
    backgroundColor: PRIMARY_10,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
    letterSpacing: 0.3,
  },

  // ── Section divider ──
  sectionDivider: {
    height: 1,
    backgroundColor: PRIMARY_10,
    marginHorizontal: 0,
  },

  // ── Nav ──
  nav: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: SLATE_500,
    letterSpacing: 1.6,
    marginBottom: 8,
    marginLeft: 4,
    // backgroundColor: "red",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  navItemPressed: {
    backgroundColor: PRIMARY_05,
  },
  navItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  navIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PRIMARY_05,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  navIconWrapSubtle: {
    backgroundColor: BORDER_SUBTLE,
    borderColor: BORDER,
  },
  badgeDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: CREAM,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: TEXT_PRIMARY,
    letterSpacing: 0.1,
  },
  navLabelSubtle: {
    color: SLATE_600,
  },

  // Wallet chip (space from label so not stuck)
  walletChip: {
    backgroundColor: PRIMARY_10,
    borderRadius: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 20,
    marginBottom: 20,
    justifyContent: "center",
  alignItems: "center",
  },
  walletChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },

  // ── Role dashboard item ──
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY_10,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    marginVertical: 2,
  },
  roleItemPressed: {
    backgroundColor: PRIMARY_05,
  },
  roleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PRIMARY_05,
    borderWidth: 1,
    borderColor: SLATE_400,
    alignItems: "center",
    justifyContent: "center",
  },
  roleItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: PRIMARY,
    letterSpacing: 0.1,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  footerDivider: {
    height: 1,
    backgroundColor: PRIMARY_10,
    marginBottom: 12,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  logoutBtnPressed: {
    backgroundColor: DANGER_BG,
  },
  logoutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: DANGER,
  },
});