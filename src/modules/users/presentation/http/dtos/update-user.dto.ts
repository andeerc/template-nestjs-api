import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  userEmailSchema,
  userNameSchema,
  userPasswordSchema,
} from './create-user.dto';

export const UpdateUserSchema = z
  .object({
    email: userEmailSchema.optional(),
    password: userPasswordSchema.optional(),
    name: userNameSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: 'At least one field must be provided',
    },
  );

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
