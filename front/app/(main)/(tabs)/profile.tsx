import { Redirect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { ProfileContent } from "@/components/common/profile-content";
import { ClientProfile } from "@/components/client/client-profile";
import { TabScreenWithAnimation } from "@/components/TabScreenWithAnimation";

export default function MainProfileScreen() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === "CLIENT") {
    return (
      <TabScreenWithAnimation>
        <ClientProfile />
      </TabScreenWithAnimation>
    );
  }

  return (
    <TabScreenWithAnimation>
      <ProfileContent />
    </TabScreenWithAnimation>
  );
}
