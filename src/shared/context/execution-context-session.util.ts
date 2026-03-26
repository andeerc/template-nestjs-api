import { ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Socket } from 'socket.io';
import { AppCurrentUser, AppSessionContext } from './app-session-context';

type SupportedContextType = 'http' | 'ws';

function getContextType(context: ExecutionContext): SupportedContextType | undefined {
  const type = context.getType<SupportedContextType | 'rpc'>();
  if (type === 'http' || type === 'ws') {
    return type;
  }

  return undefined;
}

export function getSessionFromContext(
  context: ExecutionContext,
): AppSessionContext | undefined {
  const type = getContextType(context);

  if (type === 'http') {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    return request.session;
  }

  if (type === 'ws') {
    const client = context.switchToWs().getClient<Socket>();
    return client.data.session;
  }

  return undefined;
}

export function ensureSessionOnContext(context: ExecutionContext): AppSessionContext {
  const existingSession = getSessionFromContext(context);
  if (existingSession) {
    return existingSession;
  }

  const session: AppSessionContext = {};
  setSessionOnContext(context, session);
  return session;
}

export function setSessionOnContext(
  context: ExecutionContext,
  session: AppSessionContext,
): void {
  const type = getContextType(context);

  if (type === 'http') {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    Object.assign(request.session, session);
    return;
  }

  if (type === 'ws') {
    const client = context.switchToWs().getClient<Socket>();
    client.data.session = session;
  }
}

export function getFrontendHostFromContext(
  context: ExecutionContext,
): string | undefined {
  const type = getContextType(context);

  if (type === 'http') {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    return request.headers.origin ?? request.headers.host ?? request.host;
  }

  if (type === 'ws') {
    const client = context.switchToWs().getClient<Socket>();
    const hostHeader =
      client.handshake.headers.origin ?? client.handshake.headers.host;
    return Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  }

  return undefined;
}

export function getCurrentUserFromSession(
  session?: AppSessionContext,
): AppCurrentUser | null {
  if (!session?.userId) {
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
  };
}
