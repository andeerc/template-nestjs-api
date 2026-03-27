import { Module } from '@nestjs/common';
import { EmailsModule } from '@/modules/emails/emails.module';
import { UsersPersistenceModule } from '@/modules/users/infrastructure/persistence/users-persistence.module';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { ValidatePasswordResetTokenUseCase } from './application/use-cases/validate-password-reset-token.use-case';
import { AuthPersistenceModule } from './infrastructure/persistence/auth-persistence.module';
import { AuthController } from './presentation/http/controllers/auth.controller';

/**
 * Auth Application Module
 *
 * Main authentication module for the auth feature.
 */
@Module({
  imports: [UsersPersistenceModule, AuthPersistenceModule, EmailsModule],
  providers: [
    LoginUseCase,
    RequestPasswordResetUseCase,
    ValidatePasswordResetTokenUseCase,
    ResetPasswordUseCase,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
