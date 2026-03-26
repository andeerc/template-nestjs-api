import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import { UserRepository } from './repositories/user.repository';

/**
 * Shared persistence wiring for the users feature.
 */
@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersPersistenceModule {}
