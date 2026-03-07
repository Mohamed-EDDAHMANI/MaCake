import { Stack } from "expo-router";

/**
 * (main) is a Stack: tabs (Explore, Favorites, etc.) + product detail.
 * Navigating to product from Explore or Favorites pushes this stack so the same screen works from both.
 */
export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
      initialRouteName="(tabs)"
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
    </Stack>
  );
}
