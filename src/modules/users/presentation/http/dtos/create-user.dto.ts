import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const userEmailSchema = z
  .string({
    message: 'Email is required',
  })
  .email('Must be a valid email address')
  .transform((value) => value.toLowerCase().trim());

export const userPasswordSchema = z
  .string({
    message: 'Password is required',
  })
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long');

export const userNameSchema = z
  .string({
    message: 'Name is required',
  })
  .trim()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name is too long');

export const CreateUserSchema = z.object({
  email: userEmailSchema,
  password: userPasswordSchema,
  name: userNameSchema,
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
