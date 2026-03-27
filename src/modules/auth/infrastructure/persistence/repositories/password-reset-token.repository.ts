import { Injectable } from '@nestjs/common';
import type {
  CreatePasswordResetTokenData,
  IPasswordResetTokenRepository,
} from '@/modules/auth/domain/repositories/password-reset-token.repository.interface';
import type { PasswordResetToken } from '@/modules/auth/domain/entities/password-reset-token.entity';
import { PasswordResetTokenModel } from '../models/password-reset-token.model';

@Injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
    const token = await PasswordResetTokenModel.query().insertAndFetch({
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });

    return token.toDomain();
  }

  async findValidByTokenHash(tokenHash: string, now: Date): Promise<PasswordResetToken | null> {
    const token = await PasswordResetTokenModel.query()
      .findOne({ tokenHash })
      .where('expiresAt', '>', now);

    return token ? token.toDomain() : null;
  }

  async deleteByUserId(userId: string): Promise<number> {
    return PasswordResetTokenModel.query()
      .delete()
      .where({ userId });
  }
}
