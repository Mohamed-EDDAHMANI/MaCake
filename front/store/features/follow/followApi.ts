import { api } from "@/lib/axios";

/**
 * Toggle follow on a patissiere. Requires auth (Bearer). Body: { clientId, patissiereId }.
 * All roles can use follow toggle (notation-service allows client, patissiere, livreur, admin, manager, super_admin).
 */
export async function toggleFollowApi(
  patissiereId: string,
  clientId: string,
): Promise<{ following: boolean; count: number }> {
  const res = await api.post<{
    success: boolean;
    data?: { following: boolean; count: number };
  }>("/s6/follower/toggle", { clientId, patissiereId });
  const data = res.data?.data;
  return {
    following: data?.following ?? false,
    count: data?.count ?? 0,
  };
}
