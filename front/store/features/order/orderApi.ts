import { api } from "@/lib/axios";

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  customizationDetails?: {
    colors?: string;
    garniture?: string;
    message?: string;
  };
}

export interface CreateOrderPayload {
  clientId: string;
  patissiereId: string;
  patissiereAddress: string;
  deliveryAddress: string;
  deliveryAddressSource: "profile" | "current_location";
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  requestedDateTime: string;
  totalPrice?: number;
  items: CreateOrderItemPayload[];
}

export async function createOrderApi(payload: CreateOrderPayload) {
  const res = await api.post("/s3/order/create", payload);
  return res.data;
}
