import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ORGANIZATION_MEMBERSHIP_ROLES } from "@/modules/organizations/domain/repositories/organization.repository.interface";
import {
	PERMISSION_CODES,
	PERMISSION_OVERRIDE_EFFECTS,
	SYSTEM_ROLE_CODES,
} from "@/modules/permissions/application/constants/permissions.constants";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

export const PermissionOverrideAssignmentSchema = z.object({
	permissionCode: z.enum(PERMISSION_CODES),
	effect: z.enum(PERMISSION_OVERRIDE_EFFECTS),
});

export const PermissionSnapshotResponseSchema = z.object({
	userId: snowflakeIdSchema,
	organizationId: snowflakeIdSchema,
	legacyRole: z.enum(ORGANIZATION_MEMBERSHIP_ROLES),
	roleCodes: z.array(z.enum(SYSTEM_ROLE_CODES)),
	overrides: z.array(PermissionOverrideAssignmentSchema),
	effectivePermissionCodes: z.array(z.enum(PERMISSION_CODES)),
});

export class PermissionSnapshotResponseDto extends createZodDto(
	PermissionSnapshotResponseSchema,
) {}
