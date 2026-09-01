import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

export const OrganizationMemberUserIdParamSchema = z.object({
	userId: snowflakeIdSchema,
});

export class OrganizationMemberUserIdParamDto extends createZodDto(
	OrganizationMemberUserIdParamSchema,
) {}
