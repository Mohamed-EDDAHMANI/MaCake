import "../global.css";
import { ThemeProvider, DefaultTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import "react-native-reanimated";

import { store, persistor } from "@/store";
import { AuthModalProvider } from "@/contexts/AuthModalContext";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider value={DefaultTheme}>
          <AuthModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="(client)" />
            <Stack.Screen name="(patissiere)" />
            <Stack.Screen name="(livreur)" />
          </Stack>
          <StatusBar style="dark" />
          </AuthModalProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
