import { api } from "@/lib/axios";

/**
 * Toggle like on a patissier's profile. Requires auth. Body: { userId, patissiereId }.
 */
export async function toggleProfileLikeApi(
  patissiereId: string,
  userId: string
): Promise<{ liked: boolean; count: number }> {
  const res = await api.post<{
    success: boolean;
    data?: { liked: boolean; count: number };
  }>("/s6/profile-like/toggle", { userId, patissiereId });
  const data = res.data?.data;
  return {
    liked: data?.liked ?? false,
    count: data?.count ?? 0,
  };
}

export async function getProfileLikeCountApi(
  patissiereId: string
): Promise<{ count: number }> {
  const res = await api.get<{
    success: boolean;
    data?: { count: number };
  }>(`/s6/profile-like/count`, { params: { patissiereId } });
  const data = res.data?.data;
  return { count: data?.count ?? 0 };
}

export async function checkProfileLikedApi(
  userId: string,
  patissiereId: string
): Promise<{ liked: boolean }> {
  const res = await api.get<{
    success: boolean;
    data?: { liked: boolean };
  }>(`/s6/profile-like/check`, { params: { userId, patissiereId } });
  const data = res.data?.data;
  return { liked: data?.liked ?? false };
}
