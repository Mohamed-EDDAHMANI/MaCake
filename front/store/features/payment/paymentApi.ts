import { api } from "@/lib/axios";

export interface WalletTopUpResponse {
  payment?: {
    id: string;
    amount: number;
    paymentMethod: "stripe_card" | "wallet";
    status: "blocked" | "released" | "refunded";
    stripePaymentIntentId?: string;
  };
  walletBalance?: number;
  paymentIntentId?: string;
  paymentIntentClientSecret?: string | null;
  message?: string;
}

export async function createWalletTopUpIntentApi(
  amount: number,
): Promise<WalletTopUpResponse> {
  const res = await api.post("/s5/wallet/intent", {
    amount,
  });
  return res.data?.data ?? {};
}

export async function confirmWalletTopUpApi(paymentIntentId: string): Promise<WalletTopUpResponse> {
  const res = await api.post("/s5/wallet/confirm", { paymentIntentId });
  return res.data?.data ?? {};
}

export interface CreateOrderPaymentPayload {
  orderId: string;
  paymentMethod: "wallet" | "stripe_card";
}

export interface CreateDeliveryPaymentPayload {
  estimationId: string;
  paymentMethod: "wallet" | "stripe_card";
}

export async function createOrderPaymentApi(
  payload: CreateOrderPaymentPayload,
): Promise<WalletTopUpResponse> {
  const res = await api.post("/s5/payment/create", payload);
  return res.data?.data ?? {};
}

export async function createDeliveryPaymentApi(
  payload: CreateDeliveryPaymentPayload,
): Promise<WalletTopUpResponse> {
  const res = await api.post("/s5/payment/delivery", payload);
  return res.data?.data ?? {};
}

export async function confirmOrderStripePaymentApi(paymentIntentId: string): Promise<WalletTopUpResponse> {
  const res = await api.post("/s5/payment/confirm", { paymentIntentId });
  return res.data?.data ?? {};
}

export async function confirmDeliveryStripePaymentApi(paymentIntentId: string): Promise<WalletTopUpResponse> {
  const res = await api.post("/s5/payment/delivery-confirm", { paymentIntentId });
  return res.data?.data ?? {};
}
