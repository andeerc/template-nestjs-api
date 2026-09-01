import type { OrganizationMembershipRole } from "@/modules/organizations/domain/repositories/organization.repository.interface";

export const PERMISSION_FEATURE_CODES = [
	"organizations",
	"organization_members",
	"reports",
	"report_settings",
	"users",
] as const;

export const PERMISSION_ACTION_CODES = [
	"read",
	"create",
	"update",
	"delete",
	"manage",
	"export",
] as const;

export const PERMISSION_CODES = [
	"organization_members.manage",
	"reports.export",
	"report_settings.read",
	"report_settings.update",
	"users.read",
] as const;

export const PERMISSION_OVERRIDE_EFFECTS = ["allow", "deny"] as const;

export const SYSTEM_ROLE_CODES = [
	"org_owner",
	"org_admin",
	"org_member",
	"org_report_manager",
] as const;

export const DEFAULT_ORGANIZATION_OWNER_ROLE_CODE = "org_owner";
export const DEFAULT_ORGANIZATION_MEMBER_ROLE_CODE = "org_member";

export type PermissionFeatureCode = (typeof PERMISSION_FEATURE_CODES)[number];
export type PermissionActionCode = (typeof PERMISSION_ACTION_CODES)[number];
export type PermissionCode = (typeof PERMISSION_CODES)[number];
export type PermissionOverrideEffect =
	(typeof PERMISSION_OVERRIDE_EFFECTS)[number];
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

const FEATURE_CODE_SET = new Set<string>(PERMISSION_FEATURE_CODES);
const ACTION_CODE_SET = new Set<string>(PERMISSION_ACTION_CODES);

export function isPermissionCode(code: string): code is PermissionCode {
	return (PERMISSION_CODES as readonly string[]).includes(code);
}

export function isSystemRoleCode(code: string): code is SystemRoleCode {
	return (SYSTEM_ROLE_CODES as readonly string[]).includes(code);
}

export function parsePermissionCode(
	code: string,
): { feature: PermissionFeatureCode; action: PermissionActionCode } | null {
	const [feature, action, extra] = code.split(".");

	if (
		extra !== undefined ||
		!FEATURE_CODE_SET.has(feature) ||
		!ACTION_CODE_SET.has(action)
	) {
		return null;
	}

	return {
		feature: feature as PermissionFeatureCode,
		action: action as PermissionActionCode,
	};
}

export function resolveLegacyOrganizationMembershipRole(
	roleCodes: readonly string[],
): OrganizationMembershipRole {
	if (roleCodes.includes(DEFAULT_ORGANIZATION_OWNER_ROLE_CODE)) {
		return "owner";
	}

	return "member";
}
