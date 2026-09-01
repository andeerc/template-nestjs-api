import { Logger } from "@nestjs/common";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { createClient, RedisClientType } from "redis";
import type { ServerOptions, Socket } from "socket.io";
import { envConfig } from "@/config/env.config";
import type { AppSessionContext } from "@/shared/context/app-session-context";
import { auth } from "../../../core/auth/better-auth";

type SessionAwareRequest = Partial<FastifyRequest> & {
	session?: AppSessionContext;
};

function parseCookies(cookieHeader?: string): Record<string, string> {
	if (!cookieHeader) return {};
	const out: Record<string, string> = {};
	for (const part of cookieHeader.split(";")) {
		const [rawKey, ...rest] = part.trim().split("=");
		if (!rawKey) continue;
		out[rawKey] = rest.join("=");
	}
	return out;
}

export class SessionIoAdapter extends IoAdapter {
	private readonly logger = new Logger(SessionIoAdapter.name);
	private readonly fastify: FastifyInstance;
	private pubClient?: RedisClientType;
	private subClient?: RedisClientType;
	private redisAdapter?: ReturnType<typeof createAdapter>;

	constructor(app: NestFastifyApplication) {
		super(app);
		this.fastify = app.getHttpAdapter().getInstance();
	}

	async connectToRedis(): Promise<void> {
		if (this.redisAdapter) {
			return;
		}

		this.pubClient = createClient({
			socket: {
				host: envConfig.redis.host,
				port: envConfig.redis.port,
			},
			password: envConfig.redis.password || undefined,
			database: envConfig.redis.db,
		});

		this.subClient = this.pubClient.duplicate();

		await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

		this.redisAdapter = createAdapter(this.pubClient, this.subClient);
	}

	async dispose(): Promise<void> {
		await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()]);
	}

	createIOServer(port: number, options?: ServerOptions): any {
		const server = super.createIOServer(port, {
			...options,
			path: envConfig.websocket.path,
			cors: {
				origin: true,
				credentials: true,
			},
			transports: envConfig.websocket.transports,
			connectionStateRecovery: {
				maxDisconnectionDuration:
					envConfig.websocket.connectionStateRecoveryMaxDisconnectionMs,
				skipMiddlewares: true,
			},
		});

		if (this.redisAdapter) {
			server.adapter(this.redisAdapter);
		}

		server.use((socket: Socket, next: (error?: Error) => void) => {
			void this.attachSession(socket)
				.then(() => next())
				.catch((error: unknown) => {
					const message =
						error instanceof Error
							? error.message
							: "Unable to resolve websocket session";

					this.logger.error(
						message,
						error instanceof Error ? error.stack : undefined,
					);
					socket.data.session = {};
					next();
				});
		});

		return server;
	}

	private async attachSession(socket: Socket): Promise<void> {
		try {
			const headers = new Headers();
			const cookieHeader = this.getHeaderValue(socket.handshake.headers.cookie);
			if (cookieHeader) headers.set("cookie", cookieHeader);
			const authHeader = this.getHeaderValue(
				socket.handshake.headers.authorization as unknown as
					| string
					| string[]
					| undefined,
			);
			if (authHeader) headers.set("authorization", authHeader);
			// Forward all handshake headers for better-auth to pick up session
			for (const [key, value] of Object.entries(socket.handshake.headers)) {
				if (!value) continue;
				const v = Array.isArray(value) ? value.join(", ") : (value as string);
				if (!headers.has(key)) {
					try {
						headers.set(key, v);
					} catch {
						/* ignore */
					}
				}
			}
			const session = await auth.api.getSession({ headers });
			if (session?.user) {
				const tenantHeader =
					socket.handshake.headers["x-organization-id"] ??
					socket.handshake.headers["x-tenant-id"];
				const tenantId = Array.isArray(tenantHeader)
					? tenantHeader[0]
					: (tenantHeader as string | undefined);
				socket.data.session = {
					userId: (session.user as { id: string }).id,
					email: (session.user as { email: string }).email,
					name: (session.user as { name: string }).name,
					currentOrganizationId: tenantId?.trim() || undefined,
					currentOrganizationName: undefined,
					currentOrganizationRole: undefined,
					authenticated: true,
				};
				// Also attach raw better-auth user for downstream guards
				(socket.data as Record<string, unknown>).user = session.user;
				return;
			}
		} catch (err) {
			this.logger.debug(
				`Better-auth WS verification failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		// Fallback: minimal cookie parse without fastify plugins
		try {
			const cookieHeader = this.getHeaderValue(socket.handshake.headers.cookie);
			if (!cookieHeader) {
				socket.data.session = {};
				return;
			}
			const cookies = parseCookies(cookieHeader);
			// try both legacy and better-auth cookie names
			const possibleNames = [
				envConfig.session.cookie.name,
				"better-auth.session_token",
				"better-auth.session-token",
			];
			let rawSessionId: string | undefined;
			for (const name of possibleNames) {
				const v = cookies[name];
				if (v) {
					rawSessionId = v;
					break;
				}
			}
			if (!rawSessionId) {
				socket.data.session = {};
				return;
			}
			// No fastify decrypt available after removing fastify-session; treat as empty
			socket.data.session = {};
		} catch {
			socket.data.session = {};
		}
	}

	private getHeaderValue(header?: string | string[]): string | undefined {
		if (Array.isArray(header)) {
			return header[0];
		}

		return header;
	}
}

export { SessionIoAdapter as WsIoAdapter };
