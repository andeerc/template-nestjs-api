import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { toPublicUser } from '@/modules/users/domain/entities/user.entity';
import type { PublicUser } from '@/modules/users/domain/entities/user.entity';
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  user: PublicUser;
  token?: string;
}

/**
 * Login Use Case
 *
 * Handles user authentication following SOLID principles:
 * - Single Responsibility: Only handles login logic
 * - Dependency Inversion: Depends on IUserRepository interface, not implementation
 * - Open/Closed: Can be extended without modification
 *
 * @example
 * ```typescript
 * const result = await loginUseCase.execute({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Execute login use case
   *
   * @param input - Login credentials
   * @returns User data without password
   * @throws UnauthorizedException if credentials are invalid
   */
  async execute(input: LoginInput): Promise<LoginOutput> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: toPublicUser(user),
      // In a real application, you would generate a JWT token here
      // token: await this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }
}
