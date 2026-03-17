import { User } from '@/modules/users/domain/entities/user.entity';
import { RestfulFactory } from 'nicot';

export const UsersResource = new RestfulFactory(User, {
  skipNonQueryableFields: true,
});

export class CreateUserDto extends UsersResource.createDto {}

export class UpdateUserDto extends UsersResource.updateDto {}

export class FindAllUserDto extends UsersResource.findAllDto {}
