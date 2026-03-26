import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { toPublicUser } from '@/modules/users/domain/entities/user.entity';
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

@Injectable()
export class FindUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      data: toPublicUser(user),
      message: 'User retrieved successfully',
    };
  }
}
