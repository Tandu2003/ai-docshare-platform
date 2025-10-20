import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(socket: any) {
    this.logger.log(`Client connected: ${socket.id}`);
    try {
      const token = socket.handshake?.auth?.token || null;
      if (token) {
        const payload: any = this.jwtService.verify(token);
        const userId = payload?.sub || payload?.id;
        if (userId) {
          socket.join(`user:${userId}`);
          this.logger.log(`Socket ${socket.id} joined room user:${userId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Socket ${socket.id} auth failed:`, error);
    }
  }

  handleDisconnect(socket: any) {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }
}
