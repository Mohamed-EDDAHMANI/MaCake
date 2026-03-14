import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { RegisterHeader } from "@/components/auth/RegisterHeader";
import { ProgressDots } from "@/components/auth/ProgressDots";
import { RoleStep } from "@/components/auth/RoleStep";
import { AccountDetailsStep } from "@/components/auth/AccountDetailsStep";
import { BACKGROUND_LIGHT, SLATE_500 } from "@/constants/colors";
import {
  DEFAULT_FORM_DATA,
  type RegisterRole,
  type RegisterFormData,
  type RegisterStep,
} from "@/types/register";
import {
  register as registerUser,
  type RegisterPayload,
  setCredentialsFromResponse,
} from "@/store/features/auth";
import { useAppDispatch } from "@/store/hooks";

function normalizePhoneWithLeadingZero(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly) return undefined;
  return digitsOnly.startsWith("0") ? digitsOnly : `0${digitsOnly}`;
}

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<RegisterStep>(1);
  const [selectedRole, setSelectedRole] = useState<RegisterRole | null>(null);
  const [formData, setFormData] = useState<RegisterFormData>(DEFAULT_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Array<{ field: string; message: string }> | null>(null);

  const handleContinueFromRole = () => {
    if (selectedRole) setStep(2);
  };

  const handleSubmitAccountDetails = async () => {
    if (!selectedRole || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(null);

    const payload: RegisterPayload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      phone: normalizePhoneWithLeadingZero(formData.phone),
      photo: formData.photo,
      city: formData.city || undefined,
      address: formData.address || undefined,
      country: formData.country || undefined,
      latitude: formData.latitude ?? undefined,
      longitude: formData.longitude ?? undefined,
      description: formData.description || undefined,
      role: selectedRole,
    };

    try {
      const response = await registerUser(payload);

      if (response.success && response.data) {
        dispatch(setCredentialsFromResponse(response));
        // Redirect will happen automatically via root layout
        router.replace("/");
      } else {
        if (response.errors && response.errors.length > 0) {
          setFieldErrors(response.errors);
        }
        setErrorMessage(response.message || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        setFieldErrors(data.errors);
      }
      const msg = data?.message || err?.message || "Something went wrong. Please try again.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: BACKGROUND_LIGHT }} edges={["top"]}>
      <RegisterHeader
        title="Create MaCake Account"
        onBack={step === 2 ? () => setStep(1) : undefined}
      />
      <ProgressDots currentStep={step} totalSteps={2} />

      {step === 1 && (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-slate-900 text-3xl font-bold tracking-tight text-center pb-2 pt-2">
            Join the MaCake community
          </Text>
          <Text className="text-center text-sm mb-8" style={{ color: SLATE_500 }}>
            The premium marketplace for exquisite home-baked pastries.
          </Text>
          <RoleStep selectedRole={selectedRole} onSelectRole={setSelectedRole} />
          <View style={{ paddingTop: 24 }}>
            <Pressable
              onPress={selectedRole ? handleContinueFromRole : undefined}
              disabled={!selectedRole}
              style={[
                styles.stepOneButton,
                {
                  backgroundColor: selectedRole ? "#da1b61" : "#94a3b8",
                  opacity: selectedRole ? 1 : 0.85,
                },
              ]}
            >
              <Text style={styles.stepOneButtonText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={22} color="#ffffff" />
            </Pressable>
          </View>
        </ScrollView>
      )}

      {step === 2 && (
        <AccountDetailsStep
          formData={formData}
          role={selectedRole}
          onChange={(partial) => setFormData((prev) => ({ ...prev, ...partial }))}
          onSubmit={handleSubmitAccountDetails}
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stepOneButton: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#da1b61",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  stepOneButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#ffffff",
  },
});
