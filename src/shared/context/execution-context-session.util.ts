import { ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { Socket } from "socket.io";
import {
	AppCurrentOrganization,
	AppCurrentUser,
	AppSessionContext,
} from "./app-session-context";

type SupportedContextType = "http" | "ws";

function getContextType(
	context: ExecutionContext,
): SupportedContextType | undefined {
	const type = context.getType<SupportedContextType | "rpc">();
	if (type === "http" || type === "ws") {
		return type;
	}

	return undefined;
}

export function getSessionFromContext(
	context: ExecutionContext,
): AppSessionContext | undefined {
	const type = getContextType(context);

	if (type === "http") {
		const request = context.switchToHttp().getRequest<
			FastifyRequest & {
				user?: { id?: string; email?: string; name?: string };
			}
		>();
		const session = (request as unknown as { session?: AppSessionContext })
			.session;
		const user = (
			request as unknown as {
				user?: { id?: string; email?: string; name?: string };
			}
		).user;
		if (session?.userId) return session;
		if (user?.id) {
			// Synthesize session from better-auth user when guard already attached user
			return {
				...session,
				userId: user.id,
				email: user.email,
				name: user.name,
				authenticated: true,
			};
		}
		return session;
	}

	if (type === "ws") {
		const client = context.switchToWs().getClient<Socket>();
		return client.data.session;
	}

	return undefined;
}

export function ensureSessionOnContext(
	context: ExecutionContext,
): AppSessionContext {
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

	if (type === "http") {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		if (!request.session) {
			(request as unknown as { session: AppSessionContext }).session =
				{} as AppSessionContext;
		}
		Object.assign(
			request.session as unknown as Record<string, unknown>,
			session as unknown as Record<string, unknown>,
		);
		return;
	}

	if (type === "ws") {
		const client = context.switchToWs().getClient<Socket>();
		client.data.session = session;
	}
}

export function getFrontendHostFromContext(
	context: ExecutionContext,
): string | undefined {
	const type = getContextType(context);

	if (type === "http") {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		return request.headers.origin ?? request.headers.host ?? request.host;
	}

	if (type === "ws") {
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
		name: session.name,
	};
}

export function getCurrentOrganizationFromSession(
	session?: AppSessionContext,
): AppCurrentOrganization | null {
	if (!session?.currentOrganizationId) {
		return null;
	}

	return {
		id: session.currentOrganizationId,
		name: session.currentOrganizationName,
		role: session.currentOrganizationRole,
	};
}
