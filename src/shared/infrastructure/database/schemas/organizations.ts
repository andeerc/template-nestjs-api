import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const organizationsTable = pgTable(
	"organizations",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("IDX_organizations_name").on(table.name)],
);

export type OrganizationInsert = typeof organizationsTable.$inferInsert;
export type OrganizationSelect = typeof organizationsTable.$inferSelect;
