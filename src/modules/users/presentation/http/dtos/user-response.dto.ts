import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { snowflakeIdSchema } from "@/shared/ids/snowflake-id.schema";

const DateTimeStringSchema = z.string().datetime();

export const UserResponseSchema = z.object({
	id: snowflakeIdSchema,
	email: z.email(),
	name: z.string(),
	avatarUrl: z.string().url().nullable().optional(),
	createdAt: DateTimeStringSchema,
	updatedAt: DateTimeStringSchema,
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

type UserResponseInput = {
	id: string;
	email: string;
	name: string;
	avatarUrl?: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
};

export function toUserResponseDto(user: UserResponseInput): UserResponse {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		avatarUrl: user.avatarUrl ?? null,
		createdAt: normalizeDateTime(user.createdAt),
		updatedAt: normalizeDateTime(user.updatedAt),
	};
}

function normalizeDateTime(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
