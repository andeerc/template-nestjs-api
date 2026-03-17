import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
