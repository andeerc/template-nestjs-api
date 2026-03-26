import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EmailQueueService } from '@/modules/emails/application/services/email-queue.service';
import { toPublicUser } from '@/modules/users/domain/entities/user.entity';
import type {
  CreateUserData,
  IUserRepository,
} from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

export interface CreateUserInput extends CreateUserData {}

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly emailQueueService: EmailQueueService,
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

    await this.enqueueWelcomeEmail(user.email, user.name);

    return {
      data: toPublicUser(user),
      message: 'User created successfully',
    };
  }

  private async enqueueWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await this.emailQueueService.enqueueWelcomeEmail({
        email,
        name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to enqueue welcome email for ${email}: ${message}`, stack);
    }
  }
}
