'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [sock, setSock] = useState<Socket | null>(socket);

  useEffect(() => {
    if (!socket) {
      const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      socket = io(serverUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: false, // Wait for find_match to connect? 
        // Actually, let's connect on mount
      });
      socket.connect();
    }

    setSock(socket);

    return () => {
      // Don't disconnect here to maintain socket between re-renders
      // Disconnect on logout or specific leave events
    };
  }, []);

  return sock;
}
