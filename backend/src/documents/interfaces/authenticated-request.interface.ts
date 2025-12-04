import { FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  readonly user?: {
    readonly id: string;
    readonly role?: { readonly name?: string };
    readonly [key: string]: unknown;
  };
}
