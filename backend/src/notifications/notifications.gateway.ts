import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }

      // In production, check against allowed origins
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://localhost:5173',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  namespace: '/realtime',
})
export class NotificationsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  onModuleInit() {
    this.logger.log('NotificationsGateway module initialized');
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized on namespace /realtime');
    this.logger.log(`Server instance available: ${!!server}`);
  }

  handleConnection(socket: Socket) {
    this.logger.log(
      `Client connected: ${socket.id} from ${socket.handshake.address}`,
    );
    this.logger.log(
      `Connection headers: ${JSON.stringify(socket.handshake.headers.origin)}`,
    );
    void this.authenticateSocket(socket);
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  /**
   * Handle auth update from client when token is refreshed or user logs in
   */
  @SubscribeMessage('auth:update')
  handleAuthUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { token: string },
  ): void {
    this.logger.log(`Auth update received from socket: ${socket.id}`);

    // Leave all user rooms first
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('user:')) {
        void socket.leave(room);
        this.logger.log(`Socket ${socket.id} left room ${room}`);
      }
    });

    // Re-authenticate with new token
    if (data.token) {
      void this.authenticateSocketWithToken(socket, data.token);
    }
  }

  /**
   * Handle ping from client for connection testing
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: Socket): {
    event: string;
    data: { timestamp: number };
  } {
    this.logger.debug(`Ping received from socket: ${socket.id}`);
    return {
      event: 'pong',
      data: { timestamp: Date.now() },
    };
  }

  /**
   * Handle joining a document room for realtime updates
   */
  @SubscribeMessage('document:join')
  handleDocumentJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string },
  ): void {
    if (data.documentId) {
      const room = `document:${data.documentId}`;
      void socket.join(room);
      this.logger.log(`Socket ${socket.id} joined room ${room}`);
    }
  }

  /**
   * Handle leaving a document room
   */
  @SubscribeMessage('document:leave')
  handleDocumentLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { documentId: string },
  ): void {
    if (data.documentId) {
      const room = `document:${data.documentId}`;
      void socket.leave(room);
      this.logger.log(`Socket ${socket.id} left room ${room}`);
    }
  }

  /**
   * Authenticate socket using token from handshake
   */
  private authenticateSocket(socket: Socket): void {
    try {
      const token = socket.handshake?.auth?.token || null;
      if (token) {
        this.authenticateSocketWithToken(socket, token);
      } else {
        this.logger.warn(`Socket ${socket.id} connected without token`);
        socket.emit('auth:failed', { message: 'No token provided' });
      }
    } catch (error) {
      this.logger.warn(`Socket ${socket.id} auth failed:`, error);
      socket.emit('auth:failed', { message: 'Authentication failed' });
    }
  }

  /**
   * Authenticate socket with a specific token
   */
  private authenticateSocketWithToken(socket: Socket, token: string): void {
    try {
      const payload: any = this.jwtService.verify(token);
      const userId = payload?.sub || payload?.id;

      if (userId) {
        void socket.join(`user:${userId}`);
        this.logger.log(`Socket ${socket.id} joined room user:${userId}`);
        socket.emit('auth:success', { userId });
      } else {
        this.logger.warn(`Socket ${socket.id} token has no user ID`);
        socket.emit('auth:failed', { message: 'Invalid token payload' });
      }
    } catch (error: any) {
      this.logger.warn(
        `Socket ${socket.id} token verification failed:`,
        error.message,
      );
      socket.emit('auth:failed', {
        message: error.message || 'Token verification failed',
      });
    }
  }
}
