import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string) {
    const deleted = await this.userRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User deleted successfully',
    };
  }
}
