import "../global.css";
import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { getStripeModuleSafe } from "@/lib/stripe-safe";

import { store, persistor } from "@/store";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import AppSplashScreen from "@/components/common/app-splash-screen";
import { getPaymentSocket, type LikeToggledPayload } from "@/lib/payment-socket";
import { updateProductLike } from "@/store/features/catalog";

/** Listens for like.toggled socket events and syncs Redux store across all screens. */
function LikeSocketListener() {
  const dispatch = useDispatch();
  useEffect(() => {
    const socket = getPaymentSocket();
    const handler = (p: LikeToggledPayload) => {
      dispatch(updateProductLike({ productId: p.productId, userId: null, liked: p.liked, count: p.count }));
    };
    socket.on("like.toggled", handler);
    return () => { socket.off("like.toggled", handler); };
  }, [dispatch]);
  return null;
}

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

  // Important: keep the root navigator mounted to avoid multiple linking/root
  // instances in dev (fast refresh / splash toggling).
  const appTree = (
    <ThemeProvider value={DefaultTheme}>
      <AuthModalProvider>
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="(client)" />
          </Stack>

          {showBrandSplash ? (
            <View style={styles.splashOverlay} pointerEvents="auto">
              <AppSplashScreen />
              <StatusBar style="dark" />
            </View>
          ) : null}
          {!showBrandSplash ? <StatusBar style="dark" /> : null}
        </View>
      </AuthModalProvider>
    </ThemeProvider>
  );

  const content = StripeProvider && publishableKey ? (
    <StripeProvider publishableKey={publishableKey}>{appTree}</StripeProvider>
  ) : (
    appTree
  );

  return (
    <Provider store={store}>
      <LikeSocketListener />
      {/* Render a stable navigation tree while rehydrating to avoid router rehydration edge-cases */}
      <PersistGate loading={content} persistor={persistor}>
        {content}
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
