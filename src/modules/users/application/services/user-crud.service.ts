import { Injectable } from '@nestjs/common';
import { UsersResource } from '@/modules/users/presentation/http/resources/users.resource';
import { User } from '@/modules/users/domain/entities/user.entity';
import { InjectTransactionalRepository } from 'nicot';
import { Repository } from 'typeorm';

@Injectable()
export class UserCrudService extends UsersResource.crudService() {
  constructor(
    @InjectTransactionalRepository(User)
    repo: Repository<User>,
  ) {
    super(repo);
  }
}
