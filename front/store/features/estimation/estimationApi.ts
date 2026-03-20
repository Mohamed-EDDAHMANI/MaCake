import { api } from "@/lib/axios";

export interface EstimationItem {
  id: string;
  orderId: string;
  details: string;
  price: number;
  userRole: "client" | "delivery";
  status: "pending" | "confirmed";
  createdBy?: string | null;
  /** User id of the delivery who accepted this estimation (for client estimations). */
  acceptedBy?: string | null;
  /** When the client paid the delivery fee for this estimation. */
  paidAt?: string | null;
  createdAt: string;
}

export interface CreateEstimationPayload {
  orderId: string;
  details: string;
  price: number;
}

/** Create client estimation (userRole=client, status=pending). Do not store result in Redux for "get". */
export async function createClientEstimationApi(
  payload: CreateEstimationPayload
): Promise<{ success: boolean; data: EstimationItem }> {
  const res = await api.post("/s3/estimation/client", payload);
  return res.data;
}

/** Create delivery estimation (userRole=delivery, status=pending). */
export async function createDeliveryEstimationApi(
  payload: CreateEstimationPayload
): Promise<{ success: boolean; data: EstimationItem }> {
  const res = await api.post("/s3/estimation/delivery", payload);
  return res.data;
}

/** Get estimations by orderId. Call from component and keep in local state — do not store in Redux. */
export async function getEstimationsByOrderIdApi(
  orderId: string
): Promise<EstimationItem[]> {
  const res = await api.get(`/s3/estimation/find-by-order/${orderId}`);
  return res.data?.data ?? [];
}

/** Order item shape returned by order-service */
export interface OrderItemForDelivery {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  customizationDetails?: { colors?: string; garniture?: string; message?: string };
}

/** Order shape when nested in available estimation */
export interface OrderForDelivery {
  id: string;
  clientId: string;
  patissiereId: string;
  patissiereAddress: string;
  deliveryAddress: string;
  deliveryAddressSource: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  patissiereLatitude: number | null;
  patissiereLongitude: number | null;
  requestedDateTime: string;
  totalPrice: number;
  status: string;
  items: OrderItemForDelivery[];
  createdAt: string;
}

/** One available delivery request: client estimation (pending) + full order with items */
export interface AvailableEstimationForDelivery {
  estimation: EstimationItem;
  order: OrderForDelivery;
}

/** Get pending client estimations with order + items for delivery (Available tab). Real-time: subscribe to estimation.created and refetch. */
export async function getAvailableEstimationsForDeliveryApi(): Promise<
  AvailableEstimationForDelivery[]
> {
  const res = await api.get("/s3/estimation/find-pending-client");
  return res.data?.data ?? [];
}

/** Confirm delivery's own estimation (pending → confirmed). */
export async function confirmEstimationApi(estimationId: string): Promise<{ success: boolean; data: EstimationItem }> {
  const res = await api.post(`/s3/estimation/confirm/${estimationId}`);
  return res.data;
}

/** Get delivery's accepted estimations (status confirmed, createdBy = me) with order + items for Accepted tab. */
export async function getAcceptedEstimationsForDeliveryApi(): Promise<
  AvailableEstimationForDelivery[]
> {
  const res = await api.get("/s3/estimation/find-accepted-delivery");
  return res.data?.data ?? [];
}

/** Get delivery's estimated (pending) orders - delivery has sent estimate, not yet confirmed - for Estimated tab. */
export async function getEstimatedEstimationsForDeliveryApi(): Promise<
  AvailableEstimationForDelivery[]
> {
  const res = await api.get("/s3/estimation/find-estimated-delivery");
  return res.data?.data ?? [];
}

/** Get delivery's delivered (done) orders for Historic tab. */
export async function getDeliveredEstimationsForDeliveryApi(): Promise<
  AvailableEstimationForDelivery[]
> {
  const res = await api.get("/s3/estimation/find-delivered-delivery");
  return res.data?.data ?? [];
}

/** Mark estimation as paid (client paid the delivery fee). Call after delivery payment success. */
export async function markEstimationPaidApi(estimationId: string): Promise<{ success: boolean; data?: EstimationItem }> {
  const res = await api.post(`/s3/estimation/mark-paid/${estimationId}`);
  return res.data ?? {};
}

/** Client accepts a delivery's offer (sets client estimation acceptedBy to that delivery, status confirmed). */
export async function acceptDeliveryOfferApi(
  deliveryEstimationId: string
): Promise<{ success: boolean; data?: EstimationItem }> {
  const res = await api.post(`/s3/estimation/accept-delivery-offer/${deliveryEstimationId}`);
  return res.data ?? {};
}
