import { Inject, Injectable } from '@nestjs/common';
import { User } from '@/modules/users/domain/entities/user.entity';
import {
  CreateUserData,
  FindAllUsersFilters,
  FindAllUsersResult,
  IUserRepository,
  UpdateUserData,
} from '@/modules/users/domain/repositories/user.repository.interface';
import { KNEX_CONNECTION } from '@/shared/infrastructure/database/database.constants';
import { Knex } from 'knex';

const USERS_TABLE = 'users';

type UserRow = {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapUser(row: UserRow): User {
  return new User({
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  });
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly knex: Knex,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.knex<UserRow>(USERS_TABLE)
      .where({ email })
      .first();

    return row ? mapUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.knex<UserRow>(USERS_TABLE)
      .where({ id })
      .first();

    return row ? mapUser(row) : null;
  }

  async findAll(filters: FindAllUsersFilters): Promise<FindAllUsersResult> {
    const query = this.knex<UserRow>(USERS_TABLE);

    if (filters.id) {
      query.where('id', filters.id);
    }

    if (filters.email) {
      query.where('email', filters.email);
    }

    if (filters.name) {
      query.where('name', filters.name);
    }

    const countResult = await query
      .clone()
      .count<{ total: string | number }>({ total: '*' })
      .first();

    const rows = await query
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .offset((filters.pageCount - 1) * filters.recordsPerPage)
      .limit(filters.recordsPerPage);

    return {
      data: rows.map(mapUser),
      total: Number(countResult?.total ?? 0),
    };
  }

  async create(data: CreateUserData): Promise<User> {
    const [row] = await this.knex<UserRow>(USERS_TABLE)
      .insert({
        email: data.email,
        password: data.password,
        name: data.name,
      })
      .returning('*');

    return mapUser(row);
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const updatePayload: Record<string, unknown> = {};

    if (data.email !== undefined) {
      updatePayload.email = data.email;
    }

    if (data.password !== undefined) {
      updatePayload.password = data.password;
    }

    if (data.name !== undefined) {
      updatePayload.name = data.name;
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.findById(id);
    }

    const [row] = await this.knex<UserRow>(USERS_TABLE)
      .where({ id })
      .update({
        ...updatePayload,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return row ? mapUser(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedRows = await this.knex(USERS_TABLE)
      .where({ id })
      .del();

    return deletedRows > 0;
  }
}
