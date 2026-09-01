import { SetMetadata } from "@nestjs/common";
import type { PermissionCode } from "@/modules/permissions/application/constants/permissions.constants";

export const REQUIRED_PERMISSIONS_KEY = "required_permissions";

export const RequirePermissions = (...permissionCodes: PermissionCode[]) =>
	SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionCodes);
