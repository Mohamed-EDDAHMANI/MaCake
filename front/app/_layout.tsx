import "../global.css";
import { useEffect, useState } from "react";
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { getStripeModuleSafe } from "@/lib/stripe-safe";

import { store, persistor } from "@/store";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import AppSplashScreen from "@/components/common/app-splash-screen";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showBrandSplash, setShowBrandSplash] = useState(true);

  useEffect(() => {
    // Important in dev: Fast Refresh can keep previous state (false),
    // so force splash visible before starting timer.
    setShowBrandSplash(true);

    const timer = setTimeout(async () => {
      setShowBrandSplash(false);
      await SplashScreen.hideAsync();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const stripeModule = getStripeModuleSafe();
  const StripeProvider = stripeModule?.StripeProvider;
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  const appTree = (
    <ThemeProvider value={DefaultTheme}>
      <AuthModalProvider>
        {showBrandSplash ? (
          <>
            <AppSplashScreen />
            <StatusBar style="dark" />
          </>
        ) : (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
              <Stack.Screen name="(client)" />
              <Stack.Screen name="(patissiere)" />
              <Stack.Screen name="(livreur)" />
            </Stack>
            <StatusBar style="dark" />
          </>
        )}
      </AuthModalProvider>
    </ThemeProvider>
  );

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {StripeProvider && publishableKey ? (
          <StripeProvider publishableKey={publishableKey}>{appTree}</StripeProvider>
        ) : (
          appTree
        )}
      </PersistGate>
    </Provider>
  );
}
