import { io, Socket } from 'socket.io-client';

import { API_CONFIG } from '@/config/api.config';
import { authService } from '@/utils/auth.service';

let socket: Socket | null = null;
let isConnecting = false;
export function getSocket(): Socket {
  if (!socket) {
    // Try to create socket if we have a token
    const token = authService.getAccessToken();
    if (token) {
      createSocket();
    } else {
      // Create a disconnected socket placeholder
      const socketUrl = `${API_CONFIG.BASE_URL}/realtime`;
      socket = io(socketUrl, {
        autoConnect: false,
        auth: { token: '' },
      });
    }
  }
  return socket!;
}

export function waitForSocketConnection(timeout = 5000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const sock = getSocket();

    if (sock.connected) {
      resolve(sock);
      return;
    }

    const timeoutId = setTimeout(() => {
      sock.off('connect', handleConnect);
      reject(new Error('Socket connection timeout'));
    }, timeout);

    const handleConnect = () => {
      clearTimeout(timeoutId);
      resolve(sock);
    };

    sock.once('connect', handleConnect);

    // Try to connect if not already connecting
    if (!sock.connected) {
      sock.connect();
    }
  });
}

function createSocket(): void {
  if (isConnecting) return;

  const token = authService.getAccessToken() || '';
  if (!token) {
    return;
  }

  isConnecting = true;

  const socketUrl = `${API_CONFIG.BASE_URL}/realtime`;

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
  }

  socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    transports: ['websocket', 'polling'],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: {
      token,
    },
  });

  // Handle connection events
  socket.on('connect', () => {
    isConnecting = false;
  });

  socket.on('disconnect', () => {
    isConnecting = false;
  });

  socket.on('connect_error', () => {
    isConnecting = false;
  });
}

export function reconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  isConnecting = false;
  createSocket();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  isConnecting = false;
}

export function updateSocketAuth(): void {
  const token = authService.getAccessToken() || '';

  if (socket?.connected) {
    socket.emit('auth:update', { token });
  } else {
    // If not connected, do a full reconnect
    reconnectSocket();
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function joinDocumentRoom(documentId: string): void {
  if (socket?.connected) {
    socket.emit('document:join', { documentId });
  }
}

export function leaveDocumentRoom(documentId: string): void {
  if (socket?.connected) {
    socket.emit('document:leave', { documentId });
  }
}
