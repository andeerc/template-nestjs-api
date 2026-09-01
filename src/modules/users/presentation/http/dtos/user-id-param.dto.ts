import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

export const UserIdParamSchema = z.object({
	id: snowflakeIdSchema,
});

export class UserIdParamDto extends createZodDto(UserIdParamSchema) {}
