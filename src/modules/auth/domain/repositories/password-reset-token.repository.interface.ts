import { PasswordResetToken } from '../entities/password-reset-token.entity';

export interface CreatePasswordResetTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IPasswordResetTokenRepository {
  create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken>;
  findValidByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<PasswordResetToken | null>;
  deleteByUserId(userId: string): Promise<number>;
}

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');
