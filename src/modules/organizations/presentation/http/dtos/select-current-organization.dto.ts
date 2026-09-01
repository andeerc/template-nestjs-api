import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

export const SelectCurrentOrganizationSchema = z.object({
	organizationId: snowflakeIdSchema,
});

export class SelectCurrentOrganizationDto extends createZodDto(
	SelectCurrentOrganizationSchema,
) {}
