import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Zod schema for login request
 *
 * This schema validates:
 * - Email must be a valid email format
 * - Password must be at least 6 characters
 */
export const LoginSchema = z.object({
  email: z
    .string({
      message: 'Email is required',
    })
    .email('Must be a valid email address')
    .min(1, 'Email cannot be empty')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string({
      message: 'Password is required',
    })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

/**
 * DTO class for login endpoint
 *
 * @example
 * ```json
 * {
 *   "email": "user@example.com",
 *   "password": "mySecurePassword123"
 * }
 * ```
 */
export class LoginDto extends createZodDto(LoginSchema) {}
