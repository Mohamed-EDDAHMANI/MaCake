import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { login as loginUser, setCredentialsFromResponse, logout } from "@/store/features/auth";
import { useAppDispatch } from "@/store/hooks";
import {
  PRIMARY,
  BACKGROUND_LIGHT,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SLATE_700,
  TEXT_PRIMARY,
} from "@/constants/colors";
import MaCakeLogo from "@/components/common/MaCakeLogo";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    dispatch(logout());

    try {
      const response = await loginUser({ email: trimmedEmail, password });

      if (response.success && response.data) {
        dispatch(setCredentialsFromResponse(response));
        router.replace("/");
        return;
      }

      setErrorMessage(response.message || "Login failed. Please try again.");
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.message || err?.message || "Something went wrong. Please try again.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero Header ── */}
          <View style={styles.headerOuter}>
            <LinearGradient
              colors={["#110008", "#2D0E1C", "#DA1B61"]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
            >
              {/* Decorative circles */}
              <View style={styles.deco1} />
              <View style={styles.deco2} />
              <View style={styles.deco3} />

              {/* Close button */}
              <Pressable
                onPress={() => router.replace("/")}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.8)" />
              </Pressable>

              {/* Logo + brand */}
              <View style={styles.headerCenter}>
                <MaCakeLogo size="lg" />

                <View style={styles.headerTextBlock}>
                  <Text style={styles.welcomeTitle}>Welcome Back</Text>
                  <Text style={styles.welcomeSub}>
                    Sign in to your pastry world
                  </Text>
                </View>

                {/* Small pill tags */}
                <View style={styles.pillRow}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>🎂 Handmade</Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>🛵 Fast Delivery</Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>⭐ Top Bakers</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Curved bottom cutout */}
            <View style={styles.headerCurve} />
          </View>

          {/* ── Form card ── */}
          <View style={styles.formCard}>
            {/* Form */}
            <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="mail-outline" size={22} color={SLATE_400} style={styles.inputIcon} />
                    <TextInput
                      placeholder="chef@macake.com"
                      placeholderTextColor={SLATE_400}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                    <Pressable hitSlop={8}>
                      <Text style={styles.forgotLink}>Forgot password?</Text>
                    </Pressable>
                  </View>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock-outline" size={22} color={SLATE_400} style={styles.inputIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor={SLATE_400}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                      <MaterialIcons
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={22}
                        color={SLATE_400}
                      />
                    </Pressable>
                  </View>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSignIn}
                  disabled={submitting}
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  )}
                </Pressable>
              </View>

              {/* Divider */}
              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerTextWrap}>
                  <Text style={styles.dividerText}>Or continue with</Text>
                </View>
              </View>

              {/* Social */}
              <View style={styles.socialRow}>
                <Pressable style={styles.socialBtn}>
                  <MaterialIcons name="apple" size={22} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </Pressable>
                <Pressable style={styles.socialBtn}>
                  <MaterialCommunityIcons name="google" size={22} color="#4285F4" style={{ marginRight: 8 }} />
                  <Text style={styles.socialBtnText}>Google</Text>
                </Pressable>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable onPress={() => router.push("/(auth)/register")} hitSlop={8}>
                  <Text style={styles.footerLink}>Join the Bakery</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND_LIGHT,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* ── Hero Header ── */
  headerOuter: {
    marginBottom: -1, // prevent gap between gradient and curve
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: "hidden",
    position: "relative",
  },
  deco1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -60,
    right: -60,
  },
  deco2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,140,66,0.08)",
    bottom: 10,
    left: -50,
  },
  deco3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    top: 40,
    left: 30,
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  headerCenter: {
    alignItems: "center",
    paddingBottom: 8,
  },
  headerTextBlock: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    fontWeight: "400",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
  },
  /* Curved bottom cutout */
  headerCurve: {
    height: 36,
    backgroundColor: BACKGROUND_LIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -34,
  },

  /* ── Form card ── */
  formCard: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: BACKGROUND_LIGHT,
  },
  form: {
    marginBottom: 8,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: SLATE_700,
    marginBottom: 6,
    marginLeft: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SLATE_200,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  errorBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.15)",
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  submitBtn: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  submitBtnDisabled: {
    backgroundColor: SLATE_400,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dividerWrap: {
    marginVertical: 28,
    position: "relative",
    alignItems: "center",
  },
  dividerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: SLATE_200,
  },
  dividerTextWrap: {
    paddingHorizontal: 16,
    backgroundColor: BACKGROUND_LIGHT,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: SLATE_200,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 14,
    color: SLATE_500,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },
});
