import { Module } from '@nestjs/common';
import { UsersPersistenceModule } from '@/modules/users/infrastructure/persistence/users-persistence.module';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { AuthController } from './presentation/http/controllers/auth.controller';

/**
 * Auth Application Module
 *
 * Main authentication module for the auth feature.
 */
@Module({
  imports: [UsersPersistenceModule],
  providers: [LoginUseCase],
  controllers: [AuthController],
})
export class AuthModule {}
