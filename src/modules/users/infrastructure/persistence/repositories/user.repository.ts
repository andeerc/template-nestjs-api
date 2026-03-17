import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/modules/users/domain/entities/user.entity';
import { IUserRepository } from '@/modules/users/domain/repositories/user.repository.interface';
import { Repository } from 'typeorm';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async create(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const entity = this.repo.create(userData);
    return this.repo.save(entity);
  }
}
