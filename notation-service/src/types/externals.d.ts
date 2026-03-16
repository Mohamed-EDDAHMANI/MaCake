declare module 'socket.io-client' {
  export function io(uri: string, options?: { transports?: string[] }): { emit: (event: string, payload: any) => void; disconnect: () => void };
}
