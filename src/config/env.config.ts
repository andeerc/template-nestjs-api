import { config } from "dotenv";
import { validateEnv } from "./env.validation";

config();

// Valida as variáveis de ambiente
validateEnv(process.env);

type SessionCookieSecure = boolean | "auto";
type SessionCookieSameSite = "lax" | "strict" | "none";
type WebsocketTransport = "websocket" | "polling";

function parseSessionCookieSecure(
	value: string | undefined,
): SessionCookieSecure {
	switch (value?.toLowerCase()) {
		case "true":
			return true;
		case "false":
			return false;
		default:
			return "auto";
	}
}

function normalizeAppSlug(value: string | undefined): string {
	const normalized = (value || "api")
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "api";
}

const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN?.trim();
const websocketPath =
	process.env.WS_PATH || process.env.WEBSOCKET_PATH || "/socket.io";
const websocketAllowPolling = process.env.WS_ALLOW_POLLING === "true";
const appSlug = normalizeAppSlug(process.env.APP_SLUG || process.env.APP_NAME);
const betterAuthTrustedOrigins = (process.env.CORS_ORIGIN || "*")
	.split(",")
	.map((v) => v.trim())
	.filter(Boolean);

export const envConfig = {
	port: parseInt(process.env.PORT || "3000", 10),
	appUrl: process.env.APP_URL || "http://localhost:3000",
	apiUrl: process.env.API_URL || "http://localhost:3000",
	nodeEnv: process.env.NODE_ENV || "development",
	isDevelopment: process.env.NODE_ENV !== "production",
	isProduction: process.env.NODE_ENV === "production",
	app: {
		name: process.env.APP_NAME || "NestJS API Scaffold",
		slug: appSlug,
		description:
			process.env.APP_DESCRIPTION ||
			"NestJS API Scaffold with Fastify, PostgreSQL, Redis, and feature-first modules",
	},

	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379", 10),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || "0", 10),
	},

	ids: {
		snowflakeNodeId: process.env.SNOWFLAKE_NODE_ID || "0",
	},

	cache: {
		ttl: parseInt(process.env.CACHE_TTL || "300", 10),
		max: parseInt(process.env.CACHE_MAX_ITEMS || "100", 10),
	},

	session: {
		secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
		maxAge: parseInt(process.env.SESSION_MAX_AGE || "604800000", 10),
		saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === "true",
		cookie: {
			name: process.env.SESSION_COOKIE_NAME || `${appSlug}.sid`,
			secure: parseSessionCookieSecure(process.env.SESSION_COOKIE_SECURE),
			sameSite: (process.env.SESSION_COOKIE_SAME_SITE ||
				"lax") as SessionCookieSameSite,
			path: process.env.SESSION_COOKIE_PATH || "/",
			domain: sessionCookieDomain || undefined,
		},
	},

	websocket: {
		path: websocketPath,
		allowPolling: websocketAllowPolling,
		transports: (websocketAllowPolling
			? ["websocket", "polling"]
			: ["websocket"]) as WebsocketTransport[],
		connectionStateRecoveryMaxDisconnectionMs: parseInt(
			process.env.WS_CONNECTION_STATE_RECOVERY_MAX_DISCONNECTION_MS || "120000",
			10,
		),
	},

	email: {
		enabled: process.env.EMAIL_ENABLED !== "false",
		smtp: {
			host: process.env.SMTP_HOST || "smtp.mailtrap.io",
			port: parseInt(process.env.SMTP_PORT || "2525", 10),
			secure: process.env.SMTP_SECURE === "true",
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		},
		from: process.env.SMTP_FROM || "noreply@api.com",
	},

	auth: {
		google: {
			enabled: process.env.GOOGLE_AUTH_ENABLED === "true",
			clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
		},
	},

	betterAuth: {
		secret:
			process.env.BETTER_AUTH_SECRET ||
			"change-me-min-32-chars-long-secret-1234567890",
		url:
			process.env.BETTER_AUTH_URL ||
			process.env.API_URL ||
			"http://localhost:3000",
		googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
		googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
		trustedOrigins: betterAuthTrustedOrigins,
	},
};
