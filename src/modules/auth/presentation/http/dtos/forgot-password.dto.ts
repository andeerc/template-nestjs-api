import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userEmailSchema, userPasswordSchema } from '@/modules/users/presentation/http/dtos/create-user.dto';

export const ForgotPasswordSchema = z.object({
  email: userEmailSchema,
});

export const ValidatePasswordResetTokenSchema = z.object({
  token: z
    .string({
      message: 'Token is required',
    })
    .trim()
    .min(1, 'Token cannot be empty'),
});

export const ResetPasswordSchema = z.object({
  token: ValidatePasswordResetTokenSchema.shape.token,
  password: userPasswordSchema,
});

export const ForgotPasswordResponseSchema = z.object({
  submitted: z.boolean().default(true),
});

export const ValidatePasswordResetTokenResponseSchema = z.object({
  valid: z.boolean().default(true),
  expiresAt: z.string().datetime(),
});

export const ResetPasswordResponseSchema = z.object({
  completed: z.boolean().default(true),
});

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class ValidatePasswordResetTokenDto extends createZodDto(ValidatePasswordResetTokenSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export class ForgotPasswordResponseDto extends createZodDto(ForgotPasswordResponseSchema) {}
export class ValidatePasswordResetTokenResponseDto extends createZodDto(
  ValidatePasswordResetTokenResponseSchema,
) {}
export class ResetPasswordResponseDto extends createZodDto(ResetPasswordResponseSchema) {}
