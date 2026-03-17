import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserResponseSchema } from '@/modules/users/presentation/http/dtos/user-response.dto';

/**
 * Zod schema for authentication response
 *
 * Returns user data and authentication token
 */
export const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string().optional().describe('JWT token for authentication'),
  message: z.string().default('Login successful'),
});

/**
 * DTO class for authentication response
 *
 * @example
 * ```json
 * {
 *   "user": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "email": "user@example.com",
 *     "name": "John Doe",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "message": "Login successful"
 * }
 * ```
 */
export class AuthResponseDto extends createZodDto(AuthResponseSchema) {}

