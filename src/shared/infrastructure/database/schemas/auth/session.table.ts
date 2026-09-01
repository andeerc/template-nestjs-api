import { text, timestamp } from "drizzle-orm/pg-core";
import { authSchema } from "./auth.schema";
import { userTable } from "./user.table";

export const sessionTable = authSchema.table("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export type BetterAuthSessionInsert = typeof sessionTable.$inferInsert;
export type BetterAuthSessionSelect = typeof sessionTable.$inferSelect;
export type BetterAuthSessionUpdate = Partial<BetterAuthSessionInsert>;
