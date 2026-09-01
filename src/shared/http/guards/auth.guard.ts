import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WsException } from "@nestjs/websockets";
import { auth } from "@/core/auth/better-auth";
import { getSessionFromContext } from "@/shared/context/execution-context-session.util";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * @deprecated Use BetterAuthGuard from '@/core/auth/better-auth.guard'
 * Kept as shim for backward compat. Now validates via better-auth.
 */
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		// If session already populated by BetterAuthGuard, use fast path
		const session = getSessionFromContext(context);
		if (session?.authenticated && session?.userId) {
			return true;
		}

		// Fallback: try better-auth directly (covers cases where guard order not applied)
		if (context.getType<"http" | "ws">() === "ws") {
			const client = context.switchToWs().getClient() as {
				data?: { session?: unknown };
			};
			if (
				(
					client?.data?.session as
						| { authenticated?: boolean; userId?: string }
						| undefined
				)?.authenticated
			) {
				return true;
			}
			throw new WsException("User not authenticated");
		}

		const request = context.switchToHttp().getRequest() as Record<
			string,
			unknown
		> & {
			headers: Record<string, string | string[] | undefined>;
		};

		const headers = new Headers();
		for (const [key, value] of Object.entries(request.headers ?? {})) {
			if (!value) continue;
			headers.set(
				key,
				Array.isArray(value) ? value.join(", ") : (value as string),
			);
		}

		const betterSession = await auth.api.getSession({ headers });

		if (!betterSession) {
			throw new UnauthorizedException("User not authenticated");
		}

		const anyReq = request as Record<string, unknown>;
		anyReq.user = betterSession.user;
		anyReq.session = {
			...(betterSession.session as Record<string, unknown>),
			userId: (betterSession.user as { id: string }).id,
			email: (betterSession.user as { email: string }).email,
			name: (betterSession.user as { name: string }).name,
			authenticated: true,
		};

		return true;
	}
}

export { BetterAuthGuard } from "@/core/auth/better-auth.guard";
