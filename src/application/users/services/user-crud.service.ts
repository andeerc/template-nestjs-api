import { Injectable } from '@nestjs/common';
import { UsersResource } from '@/application/http/users/resources/users.resource';
import { InjectTransactionalRepository } from 'nicot';
import { Repository } from 'typeorm';
import { User } from '@/domain/auth/entities/user.entity';

@Injectable()
export class UserCrudService extends UsersResource.crudService() {
  constructor(
    @InjectTransactionalRepository(User)
    repo: Repository<User>,
  ) {
    super(repo);
  }
}
