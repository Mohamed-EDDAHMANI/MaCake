import Constants from "expo-constants";

type StripeModule = {
  StripeProvider?: React.ComponentType<any>;
  initPaymentSheet?: (params: Record<string, unknown>) => Promise<any>;
  presentPaymentSheet?: () => Promise<any>;
};

let cachedStripeModule: StripeModule | null | undefined;

function isExpoGoRuntime(): boolean {
  const appOwnership = (Constants as any)?.appOwnership;
  const executionEnvironment = (Constants as any)?.executionEnvironment;
  // Expo Go / Store client cannot host Stripe native module.
  return appOwnership === "expo" || executionEnvironment === "storeClient";
}

export function getStripeModuleSafe(): StripeModule | null {
  if (isExpoGoRuntime()) return null;
  if (cachedStripeModule !== undefined) return cachedStripeModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@stripe/stripe-react-native");
    cachedStripeModule = mod as StripeModule;
    return cachedStripeModule;
  } catch {
    cachedStripeModule = null;
    return null;
  }
}

