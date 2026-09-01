import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
	"users",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		password: varchar("password", { length: 255 }),
		name: varchar("name", { length: 255 }).notNull(),
		googleId: varchar("google_id", { length: 255 }),
		avatarUrl: text("avatar_url"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("IDX_users_email").on(table.email),
		index("IDX_users_google_id").on(table.googleId),
		index("UQ_users_google_id").on(table.googleId),
	],
);

export type UserInsert = typeof usersTable.$inferInsert;
export type UserSelect = typeof usersTable.$inferSelect;
