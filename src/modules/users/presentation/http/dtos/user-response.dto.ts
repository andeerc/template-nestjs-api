import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DateTimeStringSchema = z.string().datetime();

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

type UserResponseInput = {
  id: string;
  email: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function toUserResponseDto(user: UserResponseInput): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: normalizeDateTime(user.createdAt),
    updatedAt: normalizeDateTime(user.updatedAt),
  };
}

function normalizeDateTime(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
