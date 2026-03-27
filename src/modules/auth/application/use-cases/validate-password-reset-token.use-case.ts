import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_RESET_TOKEN_INVALID_MESSAGE,
  PASSWORD_RESET_TOKEN_VALID_MESSAGE,
} from '../constants/password-reset.constants';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type IPasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.interface';
import { hashPasswordResetToken } from '../utils/password-reset-token.util';

export interface ValidatePasswordResetTokenInput {
  token: string;
}

@Injectable()
export class ValidatePasswordResetTokenUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
  ) {}

  async execute(input: ValidatePasswordResetTokenInput) {
    const tokenHash = hashPasswordResetToken(input.token);
    const resetToken = await this.passwordResetTokenRepository.findValidByTokenHash(
      tokenHash,
      new Date(),
    );

    if (!resetToken) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_INVALID_MESSAGE);
    }

    return {
      valid: true,
      expiresAt: resetToken.expiresAt,
      message: PASSWORD_RESET_TOKEN_VALID_MESSAGE,
    };
  }
}
