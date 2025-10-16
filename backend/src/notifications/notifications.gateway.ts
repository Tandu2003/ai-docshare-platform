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
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
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
    } catch (err) {
      this.logger.warn(`Socket ${socket.id} auth failed`);
    }
  }

  handleDisconnect(socket: any) {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }
}
