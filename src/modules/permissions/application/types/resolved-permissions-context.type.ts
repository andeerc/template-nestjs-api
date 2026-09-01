import type { OrganizationMembershipRole } from "@/modules/organizations/domain/repositories/organization.repository.interface";
import type {
	PermissionCode,
	PermissionOverrideEffect,
	SystemRoleCode,
} from "../constants/permissions.constants";
import type { AppAbility } from "./ability.types";

export interface PermissionOverrideAssignment {
	permissionCode: PermissionCode;
	effect: PermissionOverrideEffect;
}

export interface ResolvedPermissionsContext {
	userId: string;
	organizationId: string;
	legacyRole: OrganizationMembershipRole;
	roleCodes: SystemRoleCode[];
	overrides: PermissionOverrideAssignment[];
	effectivePermissionCodes: PermissionCode[];
	ability: AppAbility;
}
