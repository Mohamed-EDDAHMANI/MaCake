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

export interface ClientOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  customizationDetails?: {
    colors?: string;
    garniture?: string;
    message?: string;
  };
}

export interface ClientOrder {
  id: string;
  clientId: string;
  patissiereId: string;
  patissiereAddress: string;
  deliveryAddress: string;
  deliveryAddressSource: "profile" | "current_location";
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  requestedDateTime: string;
  totalPrice: number;
  status: "pending" | "accepted" | "preparing" | "completed" | "delivering" | "delivered" | "refused";
  items: ClientOrderItem[];
  createdAt: string;
}

export async function createOrderApi(payload: CreateOrderPayload) {
  const res = await api.post("/s3/order/create", payload);
  return res.data;
}

export async function getClientOrdersApi(): Promise<ClientOrder[]> {
  const res = await api.get("/s3/orders/find-all");
  return res.data?.data ?? [];
}

export async function getPatissiereOrdersApi(): Promise<ClientOrder[]> {
  const res = await api.get("/s3/orders/patissiere/find-all");
  return res.data?.data ?? [];
}

export async function getClientOrderByIdApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.get(`/s3/order/find-one/${orderId}`);
  return res.data?.data ?? null;
}

export async function acceptOrderApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/accept/${orderId}`);
  return res.data?.data ?? null;
}

export async function completeOrderApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/complete/${orderId}`);
  return res.data?.data ?? null;
}
