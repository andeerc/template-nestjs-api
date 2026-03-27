import { Inject, Injectable } from '@nestjs/common';
import { toPublicUser } from '@/modules/users/domain/entities/user.entity';
import type { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';

export interface ListUsersInput {
  id?: string;
  email?: string;
  name?: string;
  pageCount: number;
  recordsPerPage: number;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: ListUsersInput) {
    const result = await this.userRepository.findAll(input);

    return {
      data: result.data.map(toPublicUser),
      pageCount: input.pageCount,
      recordsPerPage: input.recordsPerPage,
      total: result.total,
      message: 'Users retrieved successfully',
    };
  }
}
