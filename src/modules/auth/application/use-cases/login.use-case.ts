import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PublicUser, toPublicUser } from '@/modules/users/domain/entities/user.entity';
import { USER_REPOSITORY, type IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  user: PublicUser;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: toPublicUser(user),
    };
  }
}
