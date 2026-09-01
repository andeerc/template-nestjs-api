/**
 * @deprecated Better-Auth replaces fastify-session + Redis session store.
 * Kept as shim for backward compat (imports still resolve).
 */
import { envConfig } from "./env.config";

export const SESSION_COOKIE_NAME =
	envConfig.session?.cookie?.name ?? `${envConfig.app.slug}.sid`;
export const SESSION_STORE_PREFIX = `${envConfig.app.slug}:session:`;
export const SESSION_TTL_SECONDS = 86400 * 7;

/**
 * @deprecated No longer used. Better-auth manages sessions via auth tables and cookies.
 */
export async function createSessionConfig(): Promise<unknown> {
	return {
		// no-op shim
		secret: envConfig.session?.secret ?? "deprecated",
		cookieName: SESSION_COOKIE_NAME,
	};
}
