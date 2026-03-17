import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import { User } from '@/modules/users/domain/entities/user.entity';
import { UserRepository } from './repositories/user.repository';

/**
 * Shared persistence wiring for the users feature.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersPersistenceModule {}
