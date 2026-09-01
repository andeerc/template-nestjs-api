import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

function emptyStringToUndefined(value: unknown) {
	if (typeof value === "string" && value.trim() === "") {
		return undefined;
	}

	return value;
}

export const ExportUsersReportSchema = z.object({
	id: z.preprocess(emptyStringToUndefined, snowflakeIdSchema.optional()),
	email: z.preprocess(emptyStringToUndefined, z.email().optional()),
	name: z.preprocess(
		emptyStringToUndefined,
		z.string().trim().min(1).max(255).optional(),
	),
	format: z.enum(["pdf", "spreadsheet"]).default("pdf"),
});

export class ExportUsersReportDto extends createZodDto(
	ExportUsersReportSchema,
) {}
