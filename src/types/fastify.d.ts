import type { AppSessionContext } from "@/shared/context/app-session-context";

declare module "fastify" {
	interface FastifyRequest {
		session: AppSessionContext & {
			save: () => Promise<void>;
			destroy?: (callback: (err?: unknown) => void) => void;
			authenticated?: boolean;
			userId?: string;
			email?: string;
			name?: string;
			currentOrganizationId?: string;
			currentOrganizationName?: string;
			currentOrganizationRole?: string;
		};
		user?: {
			id: string;
			email: string;
			name: string;
			image?: string | null;
			emailVerified?: boolean;
			[key: string]: unknown;
		};
		rawBody?: string;
	}

	interface FastifyInstance {
		parseCookie?: (
			cookieHeader: string,
		) => Record<string, string | string[] | undefined>;
		decryptSession?: (
			sessionId: string,
			request: unknown,
			callback: (err?: unknown) => void,
		) => void;
	}
}

declare module "fastify" {
	interface Session extends AppSessionContext {}
}
