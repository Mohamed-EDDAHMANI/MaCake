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
  patissiereLatitude?: number;
  patissiereLongitude?: number;
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

/** Slim order used for order-list cards (findAll response). */
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
  /** First product id — used to fetch the card thumbnail and title. */
  firstProductId: string | null;
  /** Total number of items in the order. */
  itemCount: number;
  createdAt: string;
  deletedByPatissiere: boolean;
  deletedByClient: boolean;
  /** Full items — present only when fetching a single order detail. */
  items?: ClientOrderItem[];
}

export async function createOrderApi(payload: CreateOrderPayload) {
  const res = await api.post("/s3/order/create", payload);
  return res.data;
}

function normalizeOrders(raw: any[]): ClientOrder[] {
  return raw.map((o) => {
    // Support both new slim format (firstProductId/itemCount) and old format (items[])
    const hasSlimFormat = o.firstProductId !== undefined || o.itemCount !== undefined;
    if (hasSlimFormat) return o as ClientOrder;
    const items: ClientOrderItem[] = Array.isArray(o.items) ? o.items : [];
    return {
      ...o,
      firstProductId: items[0]?.productId ?? null,
      itemCount: items.length,
      items,
    } as ClientOrder;
  });
}

export async function getClientOrdersApi(): Promise<ClientOrder[]> {
  const res = await api.get("/s3/orders/find-all");
  return normalizeOrders(res.data?.data ?? []);
}

export async function getPatissiereOrdersApi(): Promise<ClientOrder[]> {
  const res = await api.get("/s3/orders/patissiere/find-all");
  return normalizeOrders(res.data?.data ?? []);
}

export async function getClientOrderByIdApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.get(`/s3/order/find-one/${orderId}`);
  return res.data?.data ?? null;
}

export async function acceptOrderApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/accept/${orderId}`);
  return res.data?.data ?? null;
}

export async function refuseOrderApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/refuse/${orderId}`);
  return res.data?.data ?? null;
}

export async function deleteOrderApi(orderId: string): Promise<void> {
  await api.delete(`/s3/order/delete/${orderId}`);
}

export async function completeOrderApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/complete/${orderId}`);
  return res.data?.data ?? null;
}

/** Client picked up order at patissiere → mark as delivered */
export async function markDeliveredByClientApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/delivered-by-client/${orderId}`);
  return res.data?.data ?? null;
}

/** Client requests delivery → order sent for delivery (livreur) */
export async function startDeliveryApi(orderId: string): Promise<ClientOrder | null> {
  const res = await api.post(`/s3/order/start-delivery/${orderId}`);
  return res.data?.data ?? null;
}
