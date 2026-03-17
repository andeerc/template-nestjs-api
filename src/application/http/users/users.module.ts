import { Module } from '@nestjs/common';
import { UserCrudService } from '@/application/users/services/user-crud.service';
import { User } from '@/domain/auth/entities/user.entity';
import { TransactionalTypeOrmModule } from 'nicot';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [TransactionalTypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UserCrudService],
})
export class UsersModule {}
