import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schemas";
import { seedBootstrapAdmin } from "./seed-bootstrap-admin";
import { seedPermissionsCatalog } from "./seed-permissions-catalog";

async function main() {
	const connectionString = process.env.DATABASE_URL;
	const pool = connectionString
		? new Pool({
				connectionString,
				ssl:
					process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
			})
		: new Pool({
				host: process.env.DB_HOST || "localhost",
				port: Number(process.env.DB_PORT) || 5432,
				database: process.env.DB_NAME || process.env.APP_SLUG || "api",
				user: process.env.DB_USER || process.env.APP_SLUG || "api",
				password: process.env.DB_PASSWORD || "api123",
			});
	const db = drizzle(pool, {
		schema,
	}) as unknown as import("../database.types").DrizzleDb;
	console.log("Running drizzle seeds...");
	await seedBootstrapAdmin(db);
	console.log("Bootstrap admin seed done");
	await seedPermissionsCatalog(db);
	console.log("Permissions catalog seed done");
	await pool.end();
	console.log("All seeds completed");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
