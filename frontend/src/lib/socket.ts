import { io, Socket } from 'socket.io-client';

import { API_CONFIG } from '@/config/api.config';
import authService from '@/utils/auth.service';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = `${API_CONFIG.BASE_URL}/realtime`;
    console.log('Connecting to WebSocket:', socketUrl);

    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      timeout: 20000,
      auth: {
        token: authService.getAccessToken() || '',
      },
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket?.id);
    });

    socket.on('disconnect', reason => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    socket.on('connect_error', error => {
      console.error('🔌 WebSocket connection error:', error);
      if (error.message.includes('CORS')) {
        console.error('CORS error detected. Check backend CORS configuration.');
      }
    });

    // Debug: Log all socket events
    socket.onAny((eventName, ...args) => {
      console.log('🔌 Socket event received:', eventName, args);
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
