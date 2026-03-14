import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getOrderSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  // Use the same host as API (10.0.2.2:3000 for Android emulator)
  socket = io("http://10.0.2.2:3000/orders", {
    transports: ["websocket"],
  });

  return socket;
}

