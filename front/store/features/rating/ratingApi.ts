import { api } from "@/lib/axios";

export interface CreateRatingPayload {
  fromUserId: string;
  toUserId: string;
  orderId?: string;
  productId?: string;
  stars: number;
  comment?: string;
}

export async function createRatingApi(
  payload: CreateRatingPayload
): Promise<{ success: boolean; data?: { rating: unknown }; message?: string }> {
  const res = await api.post("/s6/rating/create", payload);
  return res.data ?? {};
}

export async function checkRatingByOrderApi(
  fromUserId: string,
  orderId: string
): Promise<boolean> {
  try {
    const res = await api.get("/s6/rating/check-by-order", {
      params: { fromUserId, orderId },
    });
    return res.data?.data?.hasRated ?? false;
  } catch {
    return false;
  }
}
