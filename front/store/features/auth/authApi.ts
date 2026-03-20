import { api } from "@/lib/axios";
import { fileUriToBase64, guessMimeType } from "@/lib/file-utils";
import type {
  AuthApiResponse,
  AuthResponseData,
  AuthUser,
  UserRole,
} from "./authSlice";

const LOGIN_PATH = "/s1/auth/login";
const REGISTER_PATH = "/s1/auth/register";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  photo?: string | null;
  city?: string;
  address?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  role?: UserRole;
  status?: "active" | "suspended";
}

export async function login(
  payload: LoginPayload,
): Promise<AuthApiResponse<AuthResponseData>> {
  const res = await api.post<AuthApiResponse<AuthResponseData>>(
    LOGIN_PATH,
    payload,
  );
  return res.data;
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthApiResponse<AuthResponseData>> {
  // If a local photo URI was provided, convert it to base64 so the
  // auth-service can upload it to MinIO during registration.
  let photoBase64: string | null = null;
  let photoMimetype: string | undefined;
  let photoFilename: string | undefined;

  if (payload.photo && !payload.photo.startsWith("http")) {
    photoBase64 = await fileUriToBase64(payload.photo);
    photoMimetype = guessMimeType(payload.photo);
    photoFilename = payload.photo.split("/").pop() || undefined;
  }

  const body = {
    ...payload,
    // Replace the local URI with the base64 data
    photo: photoBase64,
    photoMimetype,
    photoFilename,
  };

  const res = await api.post<AuthApiResponse<AuthResponseData>>(
    REGISTER_PATH,
    body,
  );
  return res.data;
}

/* ─── Get profile (user + rating + followers) ─── */

const GET_PROFILE_PATH = "/s1/auth/get-profile";

export interface ProfileRating {
  average: number;
  count: number;
}

export interface GetProfileResponse {
  user: AuthUser;
  rating: ProfileRating;
  followersCount: number;
  likesCount: number;
}

/**
 * Fetch current user's profile including rating and followers count.
 * Requires auth (Bearer token).
 */
export async function getProfile(): Promise<
  AuthApiResponse<GetProfileResponse>
> {
  const res = await api.get<AuthApiResponse<GetProfileResponse>>(
    GET_PROFILE_PATH,
  );
  return res.data;
}

/**
 * Fetch any user's profile by id (public). Used to display patissiere/client profile from explore.
 */
export async function getProfileById(
  userId: string,
): Promise<AuthApiResponse<GetProfileResponse>> {
  const res = await api.get<AuthApiResponse<GetProfileResponse>>(
    `/s1/auth/profile/${encodeURIComponent(userId)}`,
  );
  return res.data;
}

/**
 * Batch-fetch minimal user info (id, name, address, city) for a list of user IDs.
 * POST /s1/auth/find-by-ids
 */
export async function fetchUsersBatchApi(
  ids: string[]
): Promise<Record<string, { id: string; name: string; address: string | null; city: string | null }>> {
  if (ids.length === 0) return {};
  const res = await api.post("/s1/auth/find-by-ids", { ids });
  const users: Record<string, any> = res.data?.data?.users ?? res.data?.users ?? {};
  const result: Record<string, { id: string; name: string; address: string | null; city: string | null }> = {};
  for (const [id, u] of Object.entries(users)) {
    if (u && typeof u === "object") {
      result[id] = {
        id: String((u as any).id ?? id),
        name: String((u as any).name ?? ""),
        address: (u as any).address ?? null,
        city: (u as any).city ?? null,
      };
    }
  }
  return result;
}

/* ─── Update profile ─── */

const UPDATE_PROFILE_PATH = "/s1/auth/update-profile";

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  description?: string | null;
  photo?: string | null;
}

/**
 * Update the authenticated user's profile.
 * If a local photo URI is provided, it's converted to base64.
 */
export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<AuthApiResponse<{ user: AuthUser }>> {
  let photoBase64: string | null | undefined = payload.photo;
  let photoMimetype: string | undefined;
  let photoFilename: string | undefined;

  if (payload.photo && !payload.photo.startsWith("http")) {
    photoBase64 = await fileUriToBase64(payload.photo);
    photoMimetype = guessMimeType(payload.photo);
    photoFilename = payload.photo.split("/").pop() || undefined;
  }

  const body = {
    ...payload,
    photo: photoBase64,
    photoMimetype,
    photoFilename,
  };

  const res = await api.post<AuthApiResponse<{ user: AuthUser }>>(
    UPDATE_PROFILE_PATH,
    body,
  );
  return res.data;
}
