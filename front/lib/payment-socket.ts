import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/axios";

let socket: Socket | null = null;

export function getPaymentSocket(): Socket {
  if (socket && socket.connected) return socket;
  const base = API_BASE_URL.replace(/\/$/, "");
  socket = io(`${base}/payments`, { transports: ["websocket"] });
  return socket;
}

export type PaymentConfirmedPayload = {
  orderId: string;
  clientId: string;
  amount: number;
};

export type WalletChangedPayload = {
  userId: string;
  walletBalance: number;
};

export type LikeToggledPayload = {
  productId: string;
  liked: boolean;
  count: number;
};

export type EstimationPaidPayload = {
  estimationId: string;
  clientId: string;
  deliveryUserId: string;
  amount: number;
};
