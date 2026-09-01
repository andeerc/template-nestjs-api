import type { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "./schemas";

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export type DrizzleTransaction = Parameters<
	Parameters<DrizzleDb["transaction"]>[0]
>[0];
export type DrizzleSchema = typeof schema;
export type PgPool = Pool;
