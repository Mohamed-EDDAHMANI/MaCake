import ClientOrdersScreen from "../../(client)/orders";
import { TabScreenWithAnimation } from "@/components/TabScreenWithAnimation";

export default function MainOrdersScreen() {
  return (
    <TabScreenWithAnimation>
      <ClientOrdersScreen />
    </TabScreenWithAnimation>
  );
}
