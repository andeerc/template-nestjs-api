import { boolean, text, timestamp } from "drizzle-orm/pg-core";
import { authSchema } from "./auth.schema";

export const userTable = authSchema.table("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export type BetterAuthUserInsert = typeof userTable.$inferInsert;
export type BetterAuthUserSelect = typeof userTable.$inferSelect;
export type BetterAuthUserUpdate = Partial<BetterAuthUserInsert>;
