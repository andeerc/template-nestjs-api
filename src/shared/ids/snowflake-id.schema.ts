import { z } from "zod";

export const snowflakeIdSchema = z
	.string({
		message: "ID must be a string",
	})
	.trim()
	.regex(/^\d{1,20}$/, "ID must be a valid Snowflake");
