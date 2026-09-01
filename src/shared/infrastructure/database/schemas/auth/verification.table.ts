import { text, timestamp } from "drizzle-orm/pg-core";
import { authSchema } from "./auth.schema";

export const verificationTable = authSchema.table("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export type BetterAuthVerificationInsert =
	typeof verificationTable.$inferInsert;
export type BetterAuthVerificationSelect =
	typeof verificationTable.$inferSelect;
export type BetterAuthVerificationUpdate =
	Partial<BetterAuthVerificationInsert>;
