import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/axios";

let socket: Socket | null = null;

export function getRatingSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const base = API_BASE_URL.replace(/\/$/, "");
  socket = io(`${base}/ratings`, {
    transports: ["websocket"],
  });

  return socket;
}

export type RatingCreatedPayload = {
  toUserId: string;
  productId: string | null;
  orderId: string | null;
};
