import { useCallback, useEffect, useRef } from 'react';

import type { Socket } from 'socket.io-client';

import { disconnectSocket, getSocket, reconnectSocket } from '@/lib/socket';

import { useAuth } from './use-auth';

/**
 * Hook to manage socket connection based on auth state
 * Automatically reconnects when user logs in and disconnects when user logs out
 */
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
      console.log('🔌 useSocket: User logged in, reconnecting socket...');
      reconnectSocket();
      socketRef.current = getSocket();
    } else if (!isAuthenticated && wasAuthenticated) {
      // User just logged out - disconnect socket
      console.log('🔌 useSocket: User logged out, disconnecting socket...');
      disconnectSocket();
      socketRef.current = null;
    } else if (isAuthenticated && !socketRef.current) {
      // Already authenticated but no socket - create one
      console.log('🔌 useSocket: Authenticated but no socket, creating...');
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
      console.log('🔌 useSocket: Token changed, updating socket auth...');
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

/**
 * Hook to subscribe to a specific socket event
 * Automatically cleans up on unmount
 */
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
      console.log(`🔔 Socket event "${event}":`, data);
      handlerRef.current(data);
    };

    socket.on(event, wrappedHandler);

    return () => {
      socket.off(event, wrappedHandler);
    };
  }, [event, isAuthenticated]);
}

/**
 * Hook to get socket connection status
 */
export function useSocketStatus() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const handleConnect = () => {
      console.log('🔌 Socket connected');
    };

    const handleDisconnect = (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
    };

    const handleError = (error: Error) => {
      console.error('🔌 Socket error:', error);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
    };
  }, [isAuthenticated]);
}
