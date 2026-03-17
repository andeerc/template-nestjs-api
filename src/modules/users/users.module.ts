import { Module } from '@nestjs/common';
import { UserCrudService } from './application/services/user-crud.service';
import { User } from './domain/entities/user.entity';
import { TransactionalTypeOrmModule } from 'nicot';
import { UsersController } from './presentation/http/controllers/users.controller';

@Module({
  imports: [TransactionalTypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UserCrudService],
})
export class UsersModule {}
