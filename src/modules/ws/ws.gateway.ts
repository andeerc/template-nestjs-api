import { envConfig } from '@/config/env.config';
import type { AppSessionContext } from '@/shared/context/app-session-context';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  type WsResponse,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

type AuthenticatedSocketSession = AppSessionContext & {
  authenticated: true;
  userId: string;
};

type ConnectionSnapshot = {
  socketId: string;
  rooms: string[];
  session: {
    authenticated: true;
    userId: string;
    email: string | null;
  };
};

@WebSocketGateway({
  namespace: '/',
  path: envConfig.websocket.path,
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WsGateway
  implements OnGatewayInit<Server>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket> {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit(server: Server): void {
    this.server = server;
    this.logger.log(`Gateway WebSocket inicializado em ${envConfig.websocket.path}`);
  }

  async handleConnection(client: Socket): Promise<void> {
    const session = this.prepareSession(client);

    if (!this.isAuthenticatedSession(session)) {
      this.logger.warn(`Conexao WS rejeitada. socket=${client.id}`);
      client.emit('ws:error', {
        code: 'UNAUTHORIZED',
        message: 'Usuario nao autenticado',
      });
      client.disconnect(true);
      return;
    }

    const rooms = this.getRoomsForSession(session);
    if (rooms.length > 0) {
      await Promise.resolve(client.join(rooms));
    }

    this.logger.log(`Conexao WS aceita. socket=${client.id} user=${session.userId}`);
    client.emit('ws:ready', this.buildConnectionSnapshot(client, session));
  }

  handleDisconnect(client: Socket): void {
    const session = client.data.session;

    this.logger.log(
      `Socket desconectado. socket=${client.id} user=${session?.userId ?? 'anonimo'}`,
    );
  }

  @SubscribeMessage('ws:ping')
  handlePing(@ConnectedSocket() client: Socket): WsResponse<ConnectionSnapshot> {
    const session = this.requireAuthenticatedSession(client);

    return {
      event: 'ws:pong',
      data: this.buildConnectionSnapshot(client, session),
    };
  }

  @SubscribeMessage('ws:session')
  handleSession(
    @ConnectedSocket() client: Socket,
  ): WsResponse<ConnectionSnapshot['session']> {
    const session = this.requireAuthenticatedSession(client);

    return {
      event: 'ws:session',
      data: this.buildConnectionSnapshot(client, session).session,
    };
  }

  emitToSocket(socketId: string, event: string, payload: unknown): void {
    this.server.to(socketId).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(WsGateway.getUserRoom(userId)).emit(event, payload);
  }

  static getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private prepareSession(client: Socket): AppSessionContext {
    const session: AppSessionContext = {
      ...(client.data.session ?? {}),
    };

    client.data.session = session;
    return session;
  }

  private requireAuthenticatedSession(client: Socket): AuthenticatedSocketSession {
    const session = client.data.session;

    if (!session || !this.isAuthenticatedSession(session)) {
      throw new WsException('Usuario nao autenticado');
    }

    return session;
  }

  private buildConnectionSnapshot(
    client: Socket,
    session: AuthenticatedSocketSession,
  ): ConnectionSnapshot {
    return {
      socketId: client.id,
      rooms: this.getJoinedRooms(client),
      session: {
        authenticated: true,
        userId: session.userId,
        email: session.email ?? null,
      },
    };
  }

  private getJoinedRooms(client: Socket): string[] {
    return [...client.rooms]
      .filter((room) => room !== client.id)
      .sort();
  }

  private getRoomsForSession(session: AuthenticatedSocketSession): string[] {
    return [WsGateway.getUserRoom(session.userId)];
  }

  private isAuthenticatedSession(
    session: AppSessionContext,
  ): session is AuthenticatedSocketSession {
    return session.authenticated === true
      && typeof session.userId === 'string'
      && session.userId.length > 0;
  }
}
