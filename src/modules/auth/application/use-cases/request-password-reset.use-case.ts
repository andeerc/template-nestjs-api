import { Inject, Injectable, Logger } from '@nestjs/common';
import { envConfig } from '@/config/env.config';
import { EmailQueueService } from '@/modules/emails/application/services/email-queue.service';
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from '../constants/password-reset.constants';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type IPasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository.interface';
import { generatePasswordResetToken } from '../utils/password-reset-token.util';

export interface RequestPasswordResetInput {
  email: string;
}

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async execute(input: RequestPasswordResetInput) {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      return {
        message: PASSWORD_RESET_REQUEST_MESSAGE,
      };
    }

    const { rawToken, tokenHash } = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await this.passwordResetTokenRepository.deleteByUserId(user.id);
    await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.enqueuePasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl: buildPasswordResetUrl(rawToken),
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });

    return {
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    };
  }

  private async enqueuePasswordResetEmail(input: {
    email: string;
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): Promise<void> {
    try {
      await this.emailQueueService.enqueuePasswordResetEmail(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to enqueue password reset email for ${input.email}: ${message}`, stack);
    }
  }
}

function buildPasswordResetUrl(token: string): string {
  const appUrl = envConfig.email.appUrl.replace(/\/$/, '');
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
