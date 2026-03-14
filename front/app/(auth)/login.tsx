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
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { login as loginUser, setCredentialsFromResponse, logout } from "@/store/features/auth";
import { useAppDispatch } from "@/store/hooks";
import {
  PRIMARY,
  PRIMARY_TINT,
  BACKGROUND_LIGHT,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SLATE_700,
  TEXT_PRIMARY,
} from "@/constants/colors";

const { height: WINDOW_HEIGHT } = Dimensions.get("window");

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

  const contentMinHeight = WINDOW_HEIGHT - insets.top - insets.bottom;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <LinearGradient
          colors={["rgba(218, 27, 97, 0.12)", "transparent"]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* Top bar – fixed */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Pressable
            onPress={() => router.replace("/(main)")}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={24} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.topBarTitle}>MaCake</Text>
          <View style={styles.closeBtn} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { minHeight: contentMinHeight }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centeredBlock}>
              {/* Hero */}
              <View style={styles.hero}>
                <View style={styles.heroIconWrap}>
                  <MaterialIcons name="cake" size={48} color={PRIMARY} />
                </View>
                <Text style={styles.heroTitle}>Welcome Back</Text>
                <Text style={styles.heroSubtitle}>
                  Login to your premium pastry marketplace
                </Text>
              </View>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND_LIGHT,
  },
  container: {
    flex: 1,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    zIndex: 0,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 12,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  centeredBlock: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: 40,
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: PRIMARY_TINT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 15,
    color: SLATE_600,
    textAlign: "center",
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SLATE_200,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
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
    borderRadius: 8,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
  },
  submitBtn: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  submitBtnDisabled: {
    backgroundColor: SLATE_400,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerWrap: {
    marginVertical: 32,
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
    fontSize: 12,
    fontWeight: "600",
    color: SLATE_500,
    textTransform: "uppercase",
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SLATE_200,
    backgroundColor: "#fff",
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
