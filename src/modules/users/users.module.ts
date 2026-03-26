import { Module } from '@nestjs/common';
import { EmailsModule } from '@/modules/emails/emails.module';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { FindUserUseCase } from './application/use-cases/find-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UsersPersistenceModule } from './infrastructure/persistence/users-persistence.module';
import { UsersController } from './presentation/http/controllers/users.controller';

@Module({
  imports: [UsersPersistenceModule, EmailsModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    FindUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
})
export class UsersModule {}
