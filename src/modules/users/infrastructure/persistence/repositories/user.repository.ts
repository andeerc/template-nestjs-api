import { Injectable } from '@nestjs/common';
import { User } from '@/modules/users/domain/entities/user.entity';
import {
  CreateUserData,
  FindAllUsersFilters,
  FindAllUsersResult,
  IUserRepository,
  UpdateUserData,
} from '@/modules/users/domain/repositories/user.repository.interface';
import { UserModel } from '../models/user.model';

@Injectable()
export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.query().findOne({ email });

    return user ? user.toDomain() : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await UserModel.query().findById(id);

    return user ? user.toDomain() : null;
  }

  async findAll(filters: FindAllUsersFilters): Promise<FindAllUsersResult> {
    const query = UserModel.query();
    const shouldPaginate = filters.paginate ?? true;
    const pageCount = filters.pageCount ?? 1;
    const recordsPerPage = filters.recordsPerPage ?? 25;

    if (filters.id) {
      query.where('id', filters.id);
    }

    if (filters.email) {
      query.where('email', filters.email);
    }

    if (filters.name) {
      query.where('name', filters.name);
    }

    const total = await query.clone().resultSize();

    const usersQuery = query
      .clone()
      .select('*')
      .orderBy('createdAt', 'desc');

    if (shouldPaginate) {
      usersQuery
        .offset((pageCount - 1) * recordsPerPage)
        .limit(recordsPerPage);
    }

    const users = await usersQuery;

    return {
      data: users.map(user => user.toDomain()),
      total,
    };
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await UserModel.query().insertAndFetch({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    return user.toDomain();
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

    const knex = UserModel.knex();

    if (!knex) {
      throw new Error('Objection is not bound to a Knex connection.');
    }

    const user = await UserModel.query().patchAndFetchById(id, {
      ...updatePayload,
      updatedAt: knex.fn.now(),
    });

    return user ? user.toDomain() : null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedRows = await UserModel.query()
      .where({ id })
      .delete();

    return deletedRows > 0;
  }
}
