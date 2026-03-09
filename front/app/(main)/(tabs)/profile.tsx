import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { ProfileContent } from "@/components/common/profile-content";
import { ClientProfile } from "@/components/client/client-profile";
import { TabScreenWithAnimation } from "@/components/TabScreenWithAnimation";

export default function MainProfileScreen() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const role = useAppSelector((state) => state.auth.user?.role);
  const { showAuthModal } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated) showAuthModal();
  }, [isAuthenticated, showAuthModal]);

  if (!isAuthenticated) return null;

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
