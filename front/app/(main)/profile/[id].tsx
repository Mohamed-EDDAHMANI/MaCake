/**
 * Dynamic profile screen: view any user's profile by id.
 * Loads user + rating + followers from backend (GET /s1/auth/profile/:id).
 * Subscribes to rating.created to refetch when this user is rated.
 */
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { ProfileContent } from "@/components/common/profile-content";
import { getProfileById } from "@/store/features/auth";
import type { GetProfileResponse } from "@/store/features/auth";
import { getRatingSocket, type RatingCreatedPayload } from "@/lib/rating-socket";

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GetProfileResponse | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getProfileById(id);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError("Profil introuvable");
      }
    } catch {
      setError("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Real-time: refetch when this profile is rated
  useEffect(() => {
    if (!id) return;
    const socket = getRatingSocket();
    const handler = (payload: RatingCreatedPayload) => {
      if (payload.toUserId === id) fetchProfile();
    };
    socket.on("rating.created", handler);
    return () => {
      socket.off("rating.created", handler);
    };
  }, [id, fetchProfile]);

  if (!id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Identifiant manquant</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (error || !data?.user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Profil introuvable"}</Text>
      </View>
    );
  }

  const viewedUser = {
    id: data.user.id,
    name: data.user.name ?? null,
    email: data.user.email ?? null,
    role: data.user.role ?? null,
    photo: data.user.photo ?? null,
    coverPhoto: data.user.coverPhoto ?? null,
    description: data.user.description ?? null,
  };

  return (
    <ProfileContent
      viewedUser={viewedUser}
      viewedUserStats={{
        rating: data.rating,
        followersCount: data.followersCount,
      }}
      showBack
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#64748b",
  },
});
