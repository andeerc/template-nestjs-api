import { eq, inArray } from "drizzle-orm";
import type { DrizzleDb } from "../database.types";
import { organizationMembershipsTable } from "../schemas/organization-memberships";
import {
	organizationMembershipRolesTable,
	organizationUserPermissionsTable,
	permissionActionsTable,
	permissionFeaturesTable,
	permissionsTable,
	rolePermissionsTable,
	rolesTable,
} from "../schemas/permissions";

const FEATURES = [
	{
		id: "710000000000001001",
		code: "organizations",
		name: "Organizations",
		description: "Organization access and workspace selection",
	},
	{
		id: "710000000000001002",
		code: "organization_members",
		name: "Organization Members",
		description: "Manage membership access for the current organization",
	},
	{
		id: "710000000000001003",
		code: "reports",
		name: "Reports",
		description: "Export organization reports",
	},
	{
		id: "710000000000001004",
		code: "report_settings",
		name: "Report Settings",
		description: "Customize report branding for the current organization",
	},
	{
		id: "710000000000001005",
		code: "users",
		name: "Users",
		description: "Read users from the current organization scope",
	},
];

const ACTIONS = [
	{
		id: "710000000000002001",
		code: "read",
		name: "Read",
		description: "Read existing data",
	},
	{
		id: "710000000000002002",
		code: "create",
		name: "Create",
		description: "Create new resources",
	},
	{
		id: "710000000000002003",
		code: "update",
		name: "Update",
		description: "Update existing data",
	},
	{
		id: "710000000000002004",
		code: "delete",
		name: "Delete",
		description: "Delete resources",
	},
	{
		id: "710000000000002005",
		code: "manage",
		name: "Manage",
		description: "Manage access and administration",
	},
	{
		id: "710000000000002006",
		code: "export",
		name: "Export",
		description: "Export data and reports",
	},
];

const PERMISSIONS = [
	{
		id: "710000000000003001",
		code: "organization_members.manage",
		description: "Manage members and their access inside the organization",
		featureId: "710000000000001002",
		actionId: "710000000000002005",
	},
	{
		id: "710000000000003002",
		code: "reports.export",
		description: "Export organization reports",
		featureId: "710000000000001003",
		actionId: "710000000000002006",
	},
	{
		id: "710000000000003003",
		code: "report_settings.read",
		description: "Read report branding settings for the organization",
		featureId: "710000000000001004",
		actionId: "710000000000002001",
	},
	{
		id: "710000000000003004",
		code: "report_settings.update",
		description: "Update report branding settings for the organization",
		featureId: "710000000000001004",
		actionId: "710000000000002003",
	},
	{
		id: "710000000000003005",
		code: "users.read",
		description: "Read users within the current organization scope",
		featureId: "710000000000001005",
		actionId: "710000000000002001",
	},
];

const ROLES = [
	{
		id: "710000000000004001",
		code: "org_owner",
		name: "Organization Owner",
		description: "Full access within the organization",
	},
	{
		id: "710000000000004002",
		code: "org_admin",
		name: "Organization Admin",
		description: "Administrative access without ownership transfer",
	},
	{
		id: "710000000000004003",
		code: "org_member",
		name: "Organization Member",
		description: "Default member access",
	},
	{
		id: "710000000000004004",
		code: "org_report_manager",
		name: "Organization Report Manager",
		description: "Can export and customize organization reports",
	},
];

const ROLE_PERMISSIONS: [string, string][] = [
	["org_owner", "organization_members.manage"],
	["org_owner", "reports.export"],
	["org_owner", "report_settings.read"],
	["org_owner", "report_settings.update"],
	["org_owner", "users.read"],
	["org_admin", "organization_members.manage"],
	["org_admin", "reports.export"],
	["org_admin", "report_settings.read"],
	["org_admin", "report_settings.update"],
	["org_admin", "users.read"],
	["org_member", "report_settings.read"],
	["org_report_manager", "reports.export"],
	["org_report_manager", "report_settings.read"],
	["org_report_manager", "report_settings.update"],
];

const LEGACY_ORGANIZATION_ROLE_MAP: Record<string, string> = {
	owner: "org_owner",
	member: "org_member",
};

let nextGeneratedId = 710000000000005000n;
function generateId(): string {
	nextGeneratedId += 1n;
	return nextGeneratedId.toString();
}

export async function seedPermissionsCatalog(db: DrizzleDb): Promise<void> {
	for (const f of FEATURES) {
		await db
			.insert(permissionFeaturesTable)
			.values(f)
			.onConflictDoUpdate({
				target: permissionFeaturesTable.code,
				set: {
					name: f.name,
					description: f.description,
					updatedAt: new Date(),
				},
			});
	}
	for (const a of ACTIONS) {
		await db
			.insert(permissionActionsTable)
			.values(a)
			.onConflictDoUpdate({
				target: permissionActionsTable.code,
				set: {
					name: a.name,
					description: a.description,
					updatedAt: new Date(),
				},
			});
	}
	for (const p of PERMISSIONS) {
		await db
			.insert(permissionsTable)
			.values({
				id: p.id,
				code: p.code,
				description: p.description,
				featureId: p.featureId,
				actionId: p.actionId,
			})
			.onConflictDoUpdate({
				target: permissionsTable.code,
				set: {
					description: p.description,
					featureId: p.featureId,
					actionId: p.actionId,
					updatedAt: new Date(),
				},
			});
	}
	for (const r of ROLES) {
		await db
			.insert(rolesTable)
			.values({
				id: r.id,
				code: r.code,
				name: r.name,
				description: r.description,
				isSystem: true,
			})
			.onConflictDoUpdate({
				target: rolesTable.code,
				set: {
					name: r.name,
					description: r.description,
					isSystem: true,
					updatedAt: new Date(),
				},
			});
	}

	const roleIdByCode = Object.fromEntries(ROLES.map((r) => [r.code, r.id]));
	const permissionIdByCode = Object.fromEntries(
		PERMISSIONS.map((p) => [p.code, p.id]),
	);

	for (const [roleCode, permCode] of ROLE_PERMISSIONS) {
		await db
			.insert(rolePermissionsTable)
			.values({
				id: generateId(),
				roleId: roleIdByCode[roleCode],
				permissionId: permissionIdByCode[permCode],
			})
			.onConflictDoNothing();
	}

	for (const [legacyRole, systemRoleCode] of Object.entries(
		LEGACY_ORGANIZATION_ROLE_MAP,
	)) {
		const memberships = await db
			.select({ id: organizationMembershipsTable.id })
			.from(organizationMembershipsTable)
			.where(eq(organizationMembershipsTable.role, legacyRole));
		for (const m of memberships) {
			await db
				.insert(organizationMembershipRolesTable)
				.values({
					id: m.id,
					membershipId: m.id,
					roleId: roleIdByCode[systemRoleCode],
				})
				.onConflictDoNothing();
		}
	}
}

export async function revertPermissionsCatalog(db: DrizzleDb): Promise<void> {
	const roleCodes = ROLES.map((r) => r.code);
	const permCodes = PERMISSIONS.map((p) => p.code);
	const featureCodes = FEATURES.map((f) => f.code);
	const actionCodes = ACTIONS.map((a) => a.code);

	// Delete in dependency order
	const roleIds = (
		await db
			.select({ id: rolesTable.id })
			.from(rolesTable)
			.where(inArray(rolesTable.code, roleCodes))
	).map((r) => r.id);
	if (roleIds.length) {
		await db
			.delete(organizationMembershipRolesTable)
			.where(inArray(organizationMembershipRolesTable.roleId, roleIds));
		await db
			.delete(rolePermissionsTable)
			.where(inArray(rolePermissionsTable.roleId, roleIds));
		await db.delete(rolesTable).where(inArray(rolesTable.code, roleCodes));
	}

	const permIds = (
		await db
			.select({ id: permissionsTable.id })
			.from(permissionsTable)
			.where(inArray(permissionsTable.code, permCodes))
	).map((r) => r.id);
	if (permIds.length) {
		await db
			.delete(organizationUserPermissionsTable)
			.where(inArray(organizationUserPermissionsTable.permissionId, permIds));
		await db
			.delete(permissionsTable)
			.where(inArray(permissionsTable.code, permCodes));
	}
	await db
		.delete(permissionActionsTable)
		.where(inArray(permissionActionsTable.code, actionCodes));
	await db
		.delete(permissionFeaturesTable)
		.where(inArray(permissionFeaturesTable.code, featureCodes));
}
