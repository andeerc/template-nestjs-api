import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { envConfig } from "../../config/env.config";
import { generateSnowflakeId } from "../../shared/ids/snowflake-id.util";
import {
	accountTable,
	sessionTable,
	userTable,
	verificationTable,
} from "../../shared/infrastructure/database/schemas/auth";
import { usersTable } from "../../shared/infrastructure/database/schemas/users";

function createPool(): Pool {
	const rawUrl = process.env.DATABASE_URL?.trim();
	const isProduction = process.env.NODE_ENV === "production";
	const sslEnabled = isProduction && process.env.DB_SSL === "true";
	if (rawUrl) {
		return new Pool({
			connectionString: rawUrl,
			ssl: sslEnabled ? { rejectUnauthorized: false } : false,
			max: 10,
		});
	}
	const appSlug = envConfig.app.slug;
	return new Pool({
		host: process.env.DB_HOST || "localhost",
		port: Number(process.env.DB_PORT) || 5432,
		database: process.env.DB_NAME || appSlug,
		user: process.env.DB_USER || appSlug,
		password: process.env.DB_PASSWORD || "api123",
		ssl: sslEnabled ? { rejectUnauthorized: false } : false,
		max: 10,
	});
}

const pool = createPool();
const db = drizzle(pool, {
	schema: {
		user: userTable,
		session: sessionTable,
		account: accountTable,
		verification: verificationTable,
	},
});

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: userTable,
			session: sessionTable,
			account: accountTable,
			verification: verificationTable,
		},
	}),
	secret: envConfig.betterAuth.secret,
	baseURL: envConfig.betterAuth.url,
	trustedOrigins: envConfig.betterAuth.trustedOrigins,
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			// TODO: wire to EmailQueueService (e.g., enqueuePasswordResetEmail)
			// Keeping placeholder to enable better-auth's /request-password-reset endpoint
			// without requiring legacy password_reset_tokens table.
			console.log(
				`[better-auth] password reset link for ${user.email}: ${url}`,
			);
		},
	},
	socialProviders: {
		...(envConfig.betterAuth.googleClientId &&
		envConfig.betterAuth.googleClientSecret
			? {
					google: {
						clientId: envConfig.betterAuth.googleClientId,
						clientSecret: envConfig.betterAuth.googleClientSecret,
					},
				}
			: {}),
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
	},
	advanced: {
		database: {
			generateId: false,
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					try {
						const existing = await db
							.select()
							.from(usersTable)
							.where(eq(usersTable.email, user.email))
							.limit(1);
						if (existing.length === 0) {
							const publicId = generateSnowflakeId().slice(0, 24);
							await db.insert(usersTable).values({
								id: publicId,
								email: user.email,
								name: user.name,
								password: null,
								googleId: null,
								avatarUrl: (user as { image?: string }).image ?? null,
							} as unknown as typeof usersTable.$inferInsert);
						}
					} catch (e) {
						// eslint-disable-next-line no-console
						console.error(
							"Failed to sync public user after better-auth create",
							e,
						);
					}
				},
			},
		},
	},
});

export type Auth = typeof auth;
export { db as betterAuthDb, pool as betterAuthPool };
