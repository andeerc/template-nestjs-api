import { Module } from '@nestjs/common';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@/modules/auth/domain/repositories/password-reset-token.repository.interface';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';

@Module({
  providers: [
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PasswordResetTokenRepository,
    },
  ],
  exports: [PASSWORD_RESET_TOKEN_REPOSITORY],
})
export class AuthPersistenceModule {}
