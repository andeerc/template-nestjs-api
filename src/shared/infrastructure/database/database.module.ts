import {
	Global,
	Injectable,
	Logger,
	Module,
	OnApplicationShutdown,
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { DRIZZLE, PG_POOL } from "./database.tokens";
import type { DrizzleDb, DrizzleTransaction } from "./database.types";
import * as schema from "./schemas";

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
	readonly pool: Pool;
	readonly db: DrizzleDb;
	private readonly logger = new Logger(DatabaseService.name);

	constructor() {
		this.pool = new Pool(createPgPoolConfig());
		this.pool.on("error", (err) =>
			this.logger.error("PG Pool error", err.stack ?? String(err)),
		);
		this.db = drizzle(this.pool, { schema, logger: false }) as DrizzleDb;
	}

	async withRlsContext<T>(
		ctx: { userId?: string; organizationId?: string; role?: string },
		fn: (tx: DrizzleTransaction) => Promise<T>,
	): Promise<T> {
		return this.db.transaction(async (tx) => {
			const userId = ctx.userId ?? "";
			const orgId = ctx.organizationId ?? "";
			const role = ctx.role ?? "";
			await tx.execute(
				sql`SELECT set_config('app.current_user_id', ${userId}, true)`,
			);
			await tx.execute(
				sql`SELECT set_config('app.current_organization_id', ${orgId}, true)`,
			);
			await tx.execute(
				sql`SELECT set_config('app.current_user_role', ${role}, true)`,
			);
			await tx.execute(
				sql`SELECT set_config('app.current_organization_role', ${role}, true)`,
			);
			return fn(tx);
		});
	}

	async onApplicationShutdown(): Promise<void> {
		await this.pool.end();
	}
}

function createPgPoolConfig(): PoolConfig {
	const rawUrl = process.env.DATABASE_URL?.trim();
	const isProduction = process.env.NODE_ENV === "production";
	const sslEnabled = isProduction && process.env.DB_SSL === "true";
	if (rawUrl) {
		return {
			connectionString: rawUrl,
			ssl: sslEnabled ? { rejectUnauthorized: false } : false,
			min: 2,
			max: 10,
		};
	}
	const defaultDatabaseName = process.env.APP_SLUG || "api";
	return {
		host: process.env.DB_HOST || "localhost",
		port: Number(process.env.DB_PORT) || 5432,
		database: process.env.DB_NAME || defaultDatabaseName,
		user: process.env.DB_USER || defaultDatabaseName,
		password: process.env.DB_PASSWORD || "api123",
		ssl: sslEnabled ? { rejectUnauthorized: false } : false,
		min: 2,
		max: 10,
	};
}

@Global()
@Module({
	providers: [
		DatabaseService,
		{
			provide: PG_POOL,
			inject: [DatabaseService],
			useFactory: (svc: DatabaseService) => svc.pool,
		},
		{
			provide: DRIZZLE,
			inject: [DatabaseService],
			useFactory: (svc: DatabaseService) => svc.db,
		},
	],
	exports: [DatabaseService, PG_POOL, DRIZZLE],
})
export class DatabaseModule {}
