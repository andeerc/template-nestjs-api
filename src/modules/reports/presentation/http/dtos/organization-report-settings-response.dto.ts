import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import type { OrganizationReportSettings } from "@/modules/reports/domain/repositories/organization-report-settings.repository.interface";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

export const OrganizationReportSettingsResponseSchema = z.object({
	organizationId: snowflakeIdSchema,
	displayName: z.string().nullable(),
	headerText: z.string().nullable(),
	footerText: z.string().nullable(),
	legalText: z.string().nullable(),
	primaryColor: z.string().nullable(),
	secondaryColor: z.string().nullable(),
	hasLogo: z.boolean(),
	logoContentType: z.string().nullable(),
	logoSizeBytes: z.number().int().positive().nullable(),
});

export type OrganizationReportSettingsResponse = z.infer<
	typeof OrganizationReportSettingsResponseSchema
>;

export function toOrganizationReportSettingsResponseDto(
	organizationId: string,
	organizationName: string | undefined,
	settings?: OrganizationReportSettings | null,
): OrganizationReportSettingsResponse {
	return {
		organizationId,
		displayName: settings?.displayName ?? organizationName ?? null,
		headerText: settings?.headerText ?? null,
		footerText: settings?.footerText ?? null,
		legalText: settings?.legalText ?? null,
		primaryColor: settings?.primaryColor ?? null,
		secondaryColor: settings?.secondaryColor ?? null,
		hasLogo: Boolean(settings?.logoBlob?.length),
		logoContentType: settings?.logoContentType ?? null,
		logoSizeBytes: settings?.logoSizeBytes ?? null,
	};
}

export class OrganizationReportSettingsResponseDto extends createZodDto(
	OrganizationReportSettingsResponseSchema,
) {}
