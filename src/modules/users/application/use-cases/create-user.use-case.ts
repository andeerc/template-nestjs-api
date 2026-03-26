import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { toPublicUser } from '@/modules/users/domain/entities/user.entity';
import type {
  CreateUserData,
  IUserRepository,
} from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

export interface CreateUserInput extends CreateUserData {}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: CreateUserInput) {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('User email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await this.userRepository.create({
      ...input,
      password: hashedPassword,
    });

    return {
      data: toPublicUser(user),
      message: 'User created successfully',
    };
  }
}
