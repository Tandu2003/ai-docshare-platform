import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make authentication optional
  handleRequest(err: any, user: any) {
    // If there's no user or error, just return null (no user)
    // Don't throw error like the regular JWT guard
    return user || null;
  }
}
