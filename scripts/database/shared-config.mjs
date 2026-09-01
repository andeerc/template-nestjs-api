import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";

loadEnv();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const migrationsDirectory = path.resolve(
	currentDirectory,
	"../../src/shared/infrastructure/database/migrations",
);
export const seedsDirectory = path.resolve(
	currentDirectory,
	"../../src/shared/infrastructure/database/seeds",
);

export function createPgPoolConfig() {
	const defaultDatabaseName = process.env.APP_SLUG || "api";
	const isProduction = process.env.NODE_ENV === "production";
	return {
		host: process.env.DB_HOST || "localhost",
		port: Number(process.env.DB_PORT) || 5432,
		database: process.env.DB_NAME || defaultDatabaseName,
		user: process.env.DB_USER || defaultDatabaseName,
		password: process.env.DB_PASSWORD || "api123",
		ssl:
			isProduction && process.env.DB_SSL === "true"
				? { rejectUnauthorized: false }
				: false,
	};
}

export function createDatabaseUrl() {
	if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
	const config = createPgPoolConfig();
	const username = encodeURIComponent(config.user);
	const password = encodeURIComponent(config.password);
	const host = config.host;
	const port = config.port;
	const database = encodeURIComponent(config.database);
	const sslSuffix = config.ssl ? "?sslmode=require" : "";
	return `postgresql://${username}:${password}@${host}:${port}/${database}${sslSuffix}`;
}

export function ensureDatabaseUrl() {
	if (!process.env.DATABASE_URL?.trim()) {
		process.env.DATABASE_URL = createDatabaseUrl();
	}
	return process.env.DATABASE_URL;
}

export async function listAppliedMigrations() {
	ensureDatabaseUrl();
	// drizzle uses __drizzle_migrations table by default
	const pool = new Pool({ connectionString: ensureDatabaseUrl() });
	try {
		const result = await pool
			.query(`select * from "__drizzle_migrations" order by created_at asc`)
			.catch((e) => {
				if (e && e.code === "42P01") return { rows: [] };
				throw e;
			});
		return result.rows;
	} finally {
		await pool.end();
	}
}
