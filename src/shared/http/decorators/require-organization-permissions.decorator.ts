import { applyDecorators, UseGuards } from "@nestjs/common";
import type { PermissionCode } from "@/modules/permissions/application/constants/permissions.constants";
import { CurrentOrganizationGuard } from "@/shared/http/guards/current-organization.guard";
import { PermissionsGuard } from "@/shared/http/guards/permissions.guard";
import { RequirePermissions } from "./require-permissions.decorator";

export const RequireOrganizationPermissions = (
	...permissionCodes: PermissionCode[]
) =>
	applyDecorators(
		UseGuards(CurrentOrganizationGuard, PermissionsGuard),
		RequirePermissions(...permissionCodes),
	);
