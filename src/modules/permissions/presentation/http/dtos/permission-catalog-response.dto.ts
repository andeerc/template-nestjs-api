import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
	PERMISSION_ACTION_CODES,
	PERMISSION_CODES,
	PERMISSION_FEATURE_CODES,
	SYSTEM_ROLE_CODES,
} from "@/modules/permissions/application/constants/permissions.constants";

export const PermissionCatalogFeatureSchema = z.object({
	code: z.enum(PERMISSION_FEATURE_CODES),
	name: z.string(),
	description: z.string().nullable().optional(),
});

export const PermissionCatalogActionSchema = z.object({
	code: z.enum(PERMISSION_ACTION_CODES),
	name: z.string(),
	description: z.string().nullable().optional(),
});

export const PermissionCatalogPermissionSchema = z.object({
	code: z.enum(PERMISSION_CODES),
	featureCode: z.enum(PERMISSION_FEATURE_CODES),
	actionCode: z.enum(PERMISSION_ACTION_CODES),
	description: z.string().nullable().optional(),
});

export const PermissionCatalogRoleSchema = z.object({
	code: z.enum(SYSTEM_ROLE_CODES),
	name: z.string(),
	description: z.string().nullable().optional(),
	isSystem: z.boolean(),
});

export const PermissionCatalogResponseSchema = z.object({
	features: z.array(PermissionCatalogFeatureSchema),
	actions: z.array(PermissionCatalogActionSchema),
	permissions: z.array(PermissionCatalogPermissionSchema),
	roles: z.array(PermissionCatalogRoleSchema),
});

export class PermissionCatalogResponseDto extends createZodDto(
	PermissionCatalogResponseSchema,
) {}
