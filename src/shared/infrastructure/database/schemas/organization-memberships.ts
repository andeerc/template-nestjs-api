import {
	index,
	pgTable,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const organizationMembershipsTable = pgTable(
	"organization_memberships",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		organizationId: varchar("organization_id", { length: 24 })
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		userId: varchar("user_id", { length: 24 })
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 32 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("UQ_organization_memberships_organization_user").on(
			table.organizationId,
			table.userId,
		),
		index("IDX_organization_memberships_organization").on(table.organizationId),
		index("IDX_organization_memberships_user").on(table.userId),
	],
);

export type OrganizationMembershipInsert =
	typeof organizationMembershipsTable.$inferInsert;
export type OrganizationMembershipSelect =
	typeof organizationMembershipsTable.$inferSelect;
