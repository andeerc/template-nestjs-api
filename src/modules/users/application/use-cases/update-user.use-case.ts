import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { toPublicUser } from '@/modules/users/domain/entities/user.entity';
import type {
  IUserRepository,
  UpdateUserData,
} from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

export interface UpdateUserInput extends UpdateUserData {}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string, input: UpdateUserInput) {
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (input.email && input.email !== existingUser.email) {
      const userWithSameEmail = await this.userRepository.findByEmail(input.email);

      if (userWithSameEmail && userWithSameEmail.id !== id) {
        throw new ConflictException('User email already exists');
      }
    }

    const updatePayload: UpdateUserData = {
      ...input,
    };

    if (input.password) {
      updatePayload.password = await bcrypt.hash(input.password, 10);
    }

    const updatedUser = await this.userRepository.update(id, updatePayload);

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      data: toPublicUser(updatedUser),
      message: 'User updated successfully',
    };
  }
}
