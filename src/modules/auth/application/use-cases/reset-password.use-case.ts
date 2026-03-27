import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  PASSWORD_RESET_TOKEN_INVALID_MESSAGE,
} from '../constants/password-reset.constants';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type IPasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.interface';
import { hashPasswordResetToken } from '../utils/password-reset-token.util';

export interface ResetPasswordInput {
  token: string;
  password: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
  ) {}

  async execute(input: ResetPasswordInput) {
    const tokenHash = hashPasswordResetToken(input.token);
    const resetToken = await this.passwordResetTokenRepository.findValidByTokenHash(
      tokenHash,
      new Date(),
    );

    if (!resetToken) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_INVALID_MESSAGE);
    }

    const user = await this.userRepository.findById(resetToken.userId);
    if (!user) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_INVALID_MESSAGE);
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const updatedUser = await this.userRepository.update(user.id, {
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_INVALID_MESSAGE);
    }

    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    return {
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    };
  }
}
