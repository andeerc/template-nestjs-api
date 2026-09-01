import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { organizationMembershipsTable } from "./organization-memberships";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const permissionFeaturesTable = pgTable(
	"permission_features",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		code: varchar("code", { length: 64 }).notNull().unique(),
		name: varchar("name", { length: 128 }).notNull(),
		description: text("description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("IDX_permission_features_code").on(table.code)],
);

export const permissionActionsTable = pgTable(
	"permission_actions",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		code: varchar("code", { length: 64 }).notNull().unique(),
		name: varchar("name", { length: 128 }).notNull(),
		description: text("description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("IDX_permission_actions_code").on(table.code)],
);

export const permissionsTable = pgTable(
	"permissions",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		featureId: varchar("feature_id", { length: 24 })
			.notNull()
			.references(() => permissionFeaturesTable.id, { onDelete: "cascade" }),
		actionId: varchar("action_id", { length: 24 })
			.notNull()
			.references(() => permissionActionsTable.id, { onDelete: "cascade" }),
		code: varchar("code", { length: 128 }).notNull().unique(),
		description: text("description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("UQ_permissions_feature_action").on(table.featureId, table.actionId),
		index("IDX_permissions_feature").on(table.featureId),
		index("IDX_permissions_action").on(table.actionId),
		index("IDX_permissions_code").on(table.code),
	],
);

export const rolesTable = pgTable(
	"roles",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		code: varchar("code", { length: 64 }).notNull().unique(),
		name: varchar("name", { length: 128 }).notNull(),
		description: text("description"),
		isSystem: boolean("is_system").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("IDX_roles_code").on(table.code)],
);

export const rolePermissionsTable = pgTable(
	"role_permissions",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		roleId: varchar("role_id", { length: 24 })
			.notNull()
			.references(() => rolesTable.id, { onDelete: "cascade" }),
		permissionId: varchar("permission_id", { length: 24 })
			.notNull()
			.references(() => permissionsTable.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("UQ_role_permissions_role_permission").on(
			table.roleId,
			table.permissionId,
		),
		index("IDX_role_permissions_role").on(table.roleId),
		index("IDX_role_permissions_permission").on(table.permissionId),
	],
);

export const organizationMembershipRolesTable = pgTable(
	"organization_membership_roles",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		membershipId: varchar("membership_id", { length: 24 })
			.notNull()
			.references(() => organizationMembershipsTable.id, {
				onDelete: "cascade",
			}),
		roleId: varchar("role_id", { length: 24 })
			.notNull()
			.references(() => rolesTable.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("UQ_organization_membership_roles_membership_role").on(
			table.membershipId,
			table.roleId,
		),
		index("IDX_organization_membership_roles_membership").on(
			table.membershipId,
		),
		index("IDX_organization_membership_roles_role").on(table.roleId),
	],
);

export const organizationUserPermissionsTable = pgTable(
	"organization_user_permissions",
	{
		id: varchar("id", { length: 24 }).primaryKey(),
		organizationId: varchar("organization_id", { length: 24 })
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		userId: varchar("user_id", { length: 24 })
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		permissionId: varchar("permission_id", { length: 24 })
			.notNull()
			.references(() => permissionsTable.id, { onDelete: "cascade" }),
		effect: varchar("effect", { length: 16 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("UQ_organization_user_permissions_org_user_permission").on(
			table.organizationId,
			table.userId,
			table.permissionId,
		),
		index("IDX_organization_user_permissions_org").on(table.organizationId),
		index("IDX_organization_user_permissions_user").on(table.userId),
		index("IDX_organization_user_permissions_permission").on(
			table.permissionId,
		),
	],
);

export type PermissionFeatureInsert =
	typeof permissionFeaturesTable.$inferInsert;
export type PermissionActionInsert = typeof permissionActionsTable.$inferInsert;
export type PermissionInsert = typeof permissionsTable.$inferInsert;
export type RoleInsert = typeof rolesTable.$inferInsert;
