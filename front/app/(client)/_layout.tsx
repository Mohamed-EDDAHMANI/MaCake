import { Redirect } from "expo-router";

export default function ClientLayout() {
  // Deprecated group. Keep route compatibility but always use shared tabs.
  return <Redirect href={"/(main)" as any} />;
}
