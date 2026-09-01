import type { OrganizationMembershipRole } from "@/modules/organizations/domain/repositories/organization.repository.interface";
import type {
	PermissionCode,
	PermissionOverrideEffect,
	SystemRoleCode,
} from "@/modules/permissions/application/constants/permissions.constants";

export interface PermissionCatalogFeature {
	code: string;
	name: string;
	description?: string | null;
}

export interface PermissionCatalogAction {
	code: string;
	name: string;
	description?: string | null;
}

export interface PermissionCatalogPermission {
	code: PermissionCode;
	featureCode: string;
	actionCode: string;
	description?: string | null;
}

export interface PermissionCatalogRole {
	code: SystemRoleCode;
	name: string;
	description?: string | null;
	isSystem: boolean;
}

export interface PermissionCatalog {
	features: PermissionCatalogFeature[];
	actions: PermissionCatalogAction[];
	permissions: PermissionCatalogPermission[];
	roles: PermissionCatalogRole[];
}

export interface PermissionOverrideAssignment {
	permissionCode: PermissionCode;
	effect: PermissionOverrideEffect;
}

export interface OrganizationPermissionSnapshot {
	userId: string;
	organizationId: string;
	legacyRole: OrganizationMembershipRole;
	roleCodes: SystemRoleCode[];
	overrides: PermissionOverrideAssignment[];
	effectivePermissionCodes: PermissionCode[];
}

export interface ReplaceOrganizationMemberAccessInput {
	roleCodes: SystemRoleCode[];
	overrides: PermissionOverrideAssignment[];
}

export interface IPermissionsRepository {
	getCatalog(): Promise<PermissionCatalog>;
	getPermissionSnapshotForUser(
		userId: string,
		organizationId: string,
	): Promise<OrganizationPermissionSnapshot | null>;
	replaceOrganizationMemberAccess(
		userId: string,
		organizationId: string,
		input: ReplaceOrganizationMemberAccessInput,
	): Promise<OrganizationPermissionSnapshot | null>;
}

export const PERMISSIONS_REPOSITORY = Symbol("PERMISSIONS_REPOSITORY");
