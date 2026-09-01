import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
	PERMISSION_CODES,
	PERMISSION_OVERRIDE_EFFECTS,
	SYSTEM_ROLE_CODES,
} from "@/modules/permissions/application/constants/permissions.constants";

const UniqueSystemRoleCodesSchema = z
	.array(z.enum(SYSTEM_ROLE_CODES))
	.superRefine((value, ctx) => {
		const uniqueValues = new Set(value);

		if (uniqueValues.size !== value.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "roleCodes must not contain duplicates",
			});
		}
	});

const UniquePermissionOverridesSchema = z
	.array(
		z.object({
			permissionCode: z.enum(PERMISSION_CODES),
			effect: z.enum(PERMISSION_OVERRIDE_EFFECTS),
		}),
	)
	.superRefine((value, ctx) => {
		const uniquePermissionCodes = new Set(
			value.map((override) => override.permissionCode),
		);

		if (uniquePermissionCodes.size !== value.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "overrides must not contain duplicate permissionCode values",
			});
		}
	});

export const UpdateOrganizationMemberAccessSchema = z.object({
	roleCodes: UniqueSystemRoleCodesSchema.default([]),
	overrides: UniquePermissionOverridesSchema.default([]),
});

export class UpdateOrganizationMemberAccessDto extends createZodDto(
	UpdateOrganizationMemberAccessSchema,
) {}
