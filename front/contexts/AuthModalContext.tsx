"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PRIMARY, PRIMARY_TINT, SLATE_500, SLATE_600, TEXT_PRIMARY } from "@/constants/colors";

type AuthModalContextValue = {
  showAuthModal: () => void;
  hideAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const showAuthModal = useCallback(() => setVisible(true), []);
  const hideAuthModal = useCallback(() => setVisible(false), []);

  const goToLogin = useCallback(() => {
    setVisible(false);
    router.push("/(auth)/login");
  }, [router]);

  const goToRegister = useCallback(() => {
    setVisible(false);
    router.push("/(auth)/register");
  }, [router]);

  return (
    <AuthModalContext.Provider value={{ showAuthModal, hideAuthModal }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideAuthModal}
      >
        <Pressable style={styles.backdrop} onPress={hideAuthModal}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {Platform.OS === "ios" && (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.cardInner}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="cake" size={40} color={PRIMARY} />
              </View>
              <Text style={styles.title}>Welcome</Text>
              <Text style={styles.subtitle}>
                Login to save favorites and view patissier profiles
              </Text>
              <View style={styles.buttons}>
                <Pressable
                  style={styles.loginBtn}
                  onPress={goToLogin}
                >
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.loginBtnText}>Login</Text>
                </Pressable>
                <Pressable
                  style={styles.registerBtn}
                  onPress={goToRegister}
                >
                  <Text style={styles.registerBtnText}>Register</Text>
                </Pressable>
              </View>
              <Pressable style={styles.closeWrap} onPress={hideAuthModal}>
                <Text style={styles.closeText}>Maybe later</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AuthModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  cardInner: {
    backgroundColor: Platform.OS === "android" ? "#fff" : "rgba(255,255,255,0.92)",
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: PRIMARY_TINT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: SLATE_600,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  registerBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
  },
  closeWrap: {
    marginTop: 20,
  },
  closeText: {
    fontSize: 14,
    color: SLATE_500,
  },
});
