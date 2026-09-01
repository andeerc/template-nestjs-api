import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
	ORGANIZATION_MEMBERSHIP_ROLES,
	type OrganizationAccess,
} from "@/modules/organizations/domain/repositories/organization.repository.interface";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

const DateTimeStringSchema = z.iso.datetime();

export const OrganizationRoleSchema = z.enum(ORGANIZATION_MEMBERSHIP_ROLES);

export const OrganizationResponseSchema = z.object({
	id: snowflakeIdSchema,
	name: z.string(),
	role: OrganizationRoleSchema,
	isCurrent: z.boolean(),
	createdAt: DateTimeStringSchema,
	updatedAt: DateTimeStringSchema,
});

export const OrganizationListResponseSchema = z.array(
	OrganizationResponseSchema,
);

export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;

export function toOrganizationResponseDto(
	access: OrganizationAccess,
	currentOrganizationId?: string,
): OrganizationResponse {
	return {
		id: access.organization.id,
		name: access.organization.name,
		role: access.role,
		isCurrent: access.organization.id === currentOrganizationId,
		createdAt: normalizeDateTime(access.organization.createdAt),
		updatedAt: normalizeDateTime(access.organization.updatedAt),
	};
}

function normalizeDateTime(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

export class OrganizationResponseDto extends createZodDto(
	OrganizationResponseSchema,
) {}

export class OrganizationListResponseDto extends createZodDto(
	OrganizationListResponseSchema,
) {}
