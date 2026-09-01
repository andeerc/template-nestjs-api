import { text, timestamp } from "drizzle-orm/pg-core";
import { authSchema } from "./auth.schema";
import { userTable } from "./user.table";

export const accountTable = authSchema.table("account", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export type BetterAuthAccountInsert = typeof accountTable.$inferInsert;
export type BetterAuthAccountSelect = typeof accountTable.$inferSelect;
export type BetterAuthAccountUpdate = Partial<BetterAuthAccountInsert>;
