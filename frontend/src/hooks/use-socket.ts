import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { disconnectSocket, getSocket, reconnectSocket } from '@/lib/socket';
import { useAuth } from './use-auth';
export function useSocket() {
  const { isAuthenticated, accessToken } = useAuth();
  const previousAuthRef = useRef(isAuthenticated);
  const previousTokenRef = useRef(accessToken);
  const socketRef = useRef<Socket | null>(null);
  // Initialize socket when auth state changes
  useEffect(() => {
    const wasAuthenticated = previousAuthRef.current;
    previousAuthRef.current = isAuthenticated;

    if (isAuthenticated && !wasAuthenticated) {
      // User just logged in - reconnect socket with new token
      reconnectSocket();
      socketRef.current = getSocket();
    } else if (!isAuthenticated && wasAuthenticated) {
      // User just logged out - disconnect socket
      disconnectSocket();
      socketRef.current = null;
    } else if (isAuthenticated && !socketRef.current) {
      // Already authenticated but no socket - create one
      socketRef.current = getSocket();
    }
  }, [isAuthenticated]);

  // When accessToken changes (refresh), update socket auth
  useEffect(() => {
    const previousToken = previousTokenRef.current;
    previousTokenRef.current = accessToken;

    // Only update if we have a new token and it's different from the previous one
    if (
      isAuthenticated &&
      accessToken &&
      previousToken &&
      accessToken !== previousToken &&
      socketRef.current?.connected
    ) {
      socketRef.current.emit('auth:update', { token: accessToken });
    }
  }, [accessToken, isAuthenticated]);

  // Subscribe to socket events
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, []);

  // Emit socket events
  const emit = useCallback((event: string, data?: any) => {
    const socket = getSocket();
    socket.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    on,
    emit,
    isConnected: socketRef.current?.connected ?? false,
  };
}

export function useSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
) {
  const { isAuthenticated } = useAuth();
  const handlerRef = useRef(handler);

  // Keep handler reference up to date
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, wrappedHandler);

    return () => {
      socket.off(event, wrappedHandler);
    };
  }, [event, isAuthenticated]);
}

