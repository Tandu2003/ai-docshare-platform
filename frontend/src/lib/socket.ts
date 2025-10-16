import { io, Socket } from 'socket.io-client';

import { API_CONFIG } from '@/config/api.config';
import authService from '@/utils/auth.service';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${API_CONFIG.BASE_URL}/realtime`, {
      withCredentials: true,
      autoConnect: true,
      auth: {
        token: authService.getAccessToken() || '',
      },
    });

    // Update auth on token refresh
    window.addEventListener('auth:token', () => {
      const token = authService.getAccessToken() || '';
      socket?.disconnect();
      socket?.connect();
      socket?.emit('auth:update', { token });
    });
  }
  return socket;
}
