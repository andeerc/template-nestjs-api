import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WsException } from "@nestjs/websockets";
import { IS_PUBLIC_KEY } from "@/shared/http/decorators/public.decorator";
import { auth } from "./better-auth";

@Injectable()
export class BetterAuthGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const type = context.getType<"http" | "ws">();

		if (type === "ws") {
			// WS auth is handled via handshake; allow guard to pass and let gateway check
			const client = context.switchToWs().getClient() as {
				data?: { session?: unknown };
			};
			if (client?.data?.session) {
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

		const rawHeaders = request.headers ?? {};
		for (const [key, value] of Object.entries(rawHeaders)) {
			if (!value) continue;
			const headerValue = Array.isArray(value)
				? value.join(", ")
				: (value as string);
			try {
				headers.set(key, headerValue);
			} catch {
				// ignore invalid header
			}
		}

		// Ensure cookie and authorization are set
		if (rawHeaders.cookie && !headers.has("cookie")) {
			headers.set("cookie", rawHeaders.cookie as string);
		}
		if (rawHeaders.authorization && !headers.has("authorization")) {
			headers.set("authorization", rawHeaders.authorization as string);
		}

		const session = await auth.api.getSession({
			headers,
		});

		if (!session) {
			throw new UnauthorizedException("User not authenticated");
		}

		const anyReq = request as Record<string, unknown>;
		anyReq.user = session.user;
		anyReq.session = {
			...(session.session as Record<string, unknown>),
			// Map to AppSessionContext shape for backwards compat
			userId: (session.user as { id: string }).id,
			email: (session.user as { email: string }).email,
			name: (session.user as { name: string }).name,
			authenticated: true,
		};

		return true;
	}
}
