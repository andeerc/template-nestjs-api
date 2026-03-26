import type { AppSessionContext } from '@/shared/context/app-session-context';
import { SESSION_COOKIE_NAME, SESSION_STORE_PREFIX } from '@/config/session.config';
import { envConfig } from '@/config/env.config';
import { Logger, type INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import type { ServerOptions, Socket } from 'socket.io';

type FastifyCookieSignerResult = {
  valid: boolean;
  renew?: boolean;
  value: string | null;
};

type FastifyCookieInstance = FastifyInstance & {
  unsignCookie?: (value: string) => FastifyCookieSignerResult;
};

export class WsIoAdapter extends IoAdapter {
  private readonly logger = new Logger(WsIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private sessionClient?: Redis;

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis({
      host: envConfig.redis.host,
      port: envConfig.redis.port,
      password: envConfig.redis.password,
      db: envConfig.redis.db,
      lazyConnect: true,
    });

    const subClient = pubClient.duplicate();
    const sessionClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
      sessionClient.connect(),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.sessionClient = sessionClient;
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      path: envConfig.websocket.path,
      cors: {
        origin: true,
        credentials: true,
      },
      ...options,
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    server.use((socket: Socket, next: (error?: Error) => void) => {
      this.attachSession(socket)
        .then(() => next())
        .catch((error: unknown) => {
          const message = error instanceof Error
            ? error.message
            : 'Unable to resolve websocket session';

          this.logger.error(message, error instanceof Error ? error.stack : undefined);
          next(new Error(message));
        });
    });

    return server;
  }

  private async attachSession(socket: Socket): Promise<void> {
    socket.data.session = await this.resolveSession(socket);
  }

  private async resolveSession(socket: Socket): Promise<AppSessionContext> {
    const cookieHeader = this.getHeaderValue(socket.handshake.headers.cookie);
    if (!cookieHeader || !this.sessionClient) {
      return {};
    }

    const signedSessionId = this.getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
    if (!signedSessionId) {
      return {};
    }

    const sessionId = this.unsignSessionId(signedSessionId);
    if (!sessionId) {
      return {};
    }

    const rawSession = await this.sessionClient.get(`${SESSION_STORE_PREFIX}${sessionId}`);
    if (!rawSession) {
      return {};
    }

    return this.parseSession(rawSession);
  }

  private unsignSessionId(signedSessionId: string): string | undefined {
    const fastifyInstance = this.app.getHttpAdapter().getInstance() as FastifyCookieInstance;

    if (typeof fastifyInstance.unsignCookie !== 'function') {
      this.logger.warn('fastify unsignCookie is not available for websocket session resolution');
      return undefined;
    }

    const result = fastifyInstance.unsignCookie(signedSessionId);
    if (!result.valid || !result.value) {
      return undefined;
    }

    return result.value;
  }

  private parseSession(rawSession: string): AppSessionContext {
    try {
      const session = JSON.parse(rawSession) as AppSessionContext;

      return {
        userId: session.userId,
        email: session.email,
        authenticated: session.authenticated,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to parse websocket session payload: ${error instanceof Error ? error.message : 'unknown error'}`,
      );

      return {};
    }
  }

  private getCookieValue(cookieHeader: string, cookieName: string): string | undefined {
    const targetCookie = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`));

    if (!targetCookie) {
      return undefined;
    }

    const rawValue = targetCookie.slice(cookieName.length + 1).replace(/^"|"$/g, '');

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  private getHeaderValue(header?: string | string[]): string | undefined {
    if (Array.isArray(header)) {
      return header[0];
    }

    return header;
  }
}
