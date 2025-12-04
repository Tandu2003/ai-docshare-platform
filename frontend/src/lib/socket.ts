import { io, Socket } from 'socket.io-client';

import { API_CONFIG } from '@/config/api.config';
import { authService } from '@/utils/auth.service';

let socket: Socket | null = null;
let isConnecting = false;

/**
 * Get current socket instance
 * Returns existing socket or creates a new one if authenticated
 */
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

/**
 * Wait for socket to be connected
 * Returns a promise that resolves when socket is connected
 */
export function waitForSocketConnection(timeout = 5000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const sock = getSocket();

    console.log('🔌 waitForSocketConnection: Socket state:', {
      connected: sock.connected,
      disconnected: sock.disconnected,
      id: sock.id,
    });

    if (sock.connected) {
      console.log(
        '🔌 waitForSocketConnection: Already connected, resolving immediately',
      );
      resolve(sock);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('🔌 waitForSocketConnection: Timeout reached');
      sock.off('connect', handleConnect);
      reject(new Error('Socket connection timeout'));
    }, timeout);

    const handleConnect = () => {
      console.log('🔌 waitForSocketConnection: Connect event fired');
      clearTimeout(timeoutId);
      resolve(sock);
    };

    sock.once('connect', handleConnect);

    // Try to connect if not already connecting
    if (!sock.connected) {
      console.log('🔌 waitForSocketConnection: Calling sock.connect()');
      sock.connect();
    }
  });
}

/**
 * Create a new socket connection with current auth token
 */
function createSocket(): void {
  if (isConnecting) return;

  const token = authService.getAccessToken() || '';
  if (!token) {
    console.log('🔌 Cannot create socket: No auth token available');
    return;
  }

  isConnecting = true;

  const socketUrl = `${API_CONFIG.BASE_URL}/realtime`;
  console.log(
    '🔌 Creating WebSocket connection:',
    socketUrl,
    'Token:',
    token ? 'present' : 'missing',
  );

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
    console.log('🔌 WebSocket connected:', socket?.id);
    isConnecting = false;
  });

  socket.on('disconnect', reason => {
    console.log('🔌 WebSocket disconnected:', reason);
    isConnecting = false;
  });

  socket.on('connect_error', error => {
    console.error('🔌 WebSocket connection error:', error);
    isConnecting = false;
    if (error.message.includes('CORS')) {
      console.error('CORS error detected. Check backend CORS configuration.');
    }
  });

  // Handle successful auth acknowledgment from server
  socket.on('auth:success', (data: { userId: string }) => {
    console.log('🔌 Socket authenticated for user:', data.userId);
  });

  // Handle auth failure
  socket.on('auth:failed', (data: { message: string }) => {
    console.warn('🔌 Socket auth failed:', data.message);
  });

  // Debug: Log all socket events
  socket.onAny((eventName, ...args) => {
    console.log('🔌 Socket event received:', eventName, args);
  });
}

/**
 * Reconnect socket with new auth token
 * Call this when user logs in or token is refreshed
 */
export function reconnectSocket(): void {
  console.log('🔌 Reconnecting socket with new token...');

  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  isConnecting = false;
  createSocket();
}

/**
 * Disconnect and cleanup socket
 * Call this when user logs out
 */
export function disconnectSocket(): void {
  console.log('🔌 Disconnecting socket...');

  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }

  isConnecting = false;
}

/**
 * Update socket auth without full reconnection
 * This sends an auth update message to the server
 */
export function updateSocketAuth(): void {
  const token = authService.getAccessToken() || '';

  if (socket?.connected) {
    console.log('🔌 Updating socket auth...');
    socket.emit('auth:update', { token });
  } else {
    // If not connected, do a full reconnect
    reconnectSocket();
  }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Join a document room to receive realtime updates
 * @param documentId The document ID to join
 */
export function joinDocumentRoom(documentId: string): void {
  if (socket?.connected) {
    console.log('🔌 Joining document room:', documentId);
    socket.emit('document:join', { documentId });
  } else {
    console.warn('🔌 Cannot join document room: Socket not connected');
  }
}

/**
 * Leave a document room
 * @param documentId The document ID to leave
 */
export function leaveDocumentRoom(documentId: string): void {
  if (socket?.connected) {
    console.log('🔌 Leaving document room:', documentId);
    socket.emit('document:leave', { documentId });
  }
}
