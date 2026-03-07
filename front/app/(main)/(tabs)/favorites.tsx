import ClientFavoritesScreen from "../../(client)/favorites";
import { TabScreenWithAnimation } from "@/components/TabScreenWithAnimation";

export default function MainFavoritesScreen() {
  return (
    <TabScreenWithAnimation>
      <ClientFavoritesScreen />
    </TabScreenWithAnimation>
  );
}
