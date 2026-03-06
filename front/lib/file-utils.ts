import { Platform } from "react-native";
import { File as ExpoFile } from "expo-file-system/next";

/**
 * Convert a local file URI (from expo-image-picker) into a raw base64 string.
 * Returns null on failure.
 */
export async function fileUriToBase64(uri: string): Promise<string | null> {
  try {
    if (!uri) return null;
    if (Platform.OS === "web") return uri;
    const file = new ExpoFile(uri);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return globalThis.btoa(binary);
  } catch (err) {
    console.warn("[file-utils] Failed to convert URI to base64:", err);
    return null;
  }
}

/** Guess MIME type from a local file URI extension */
export function guessMimeType(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return map[ext ?? ""] || "image/jpeg";
}
