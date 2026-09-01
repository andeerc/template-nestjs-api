import { createZodDto } from "nestjs-zod";
import { z } from "zod";

function emptyStringToNull(value: unknown) {
	if (typeof value === "string" && value.trim() === "") {
		return null;
	}

	return value;
}

const NullableTrimmedString = z.preprocess(
	emptyStringToNull,
	z.string().trim().min(1).max(1000).nullable().optional(),
);

export const UpdateOrganizationReportSettingsSchema = z.object({
	displayName: z.preprocess(
		emptyStringToNull,
		z.string().trim().min(1).max(255).nullable().optional(),
	),
	headerText: NullableTrimmedString,
	footerText: NullableTrimmedString,
	legalText: NullableTrimmedString,
	primaryColor: z.preprocess(
		emptyStringToNull,
		z.string().trim().max(32).nullable().optional(),
	),
	secondaryColor: z.preprocess(
		emptyStringToNull,
		z.string().trim().max(32).nullable().optional(),
	),
});

export class UpdateOrganizationReportSettingsDto extends createZodDto(
	UpdateOrganizationReportSettingsSchema,
) {}
