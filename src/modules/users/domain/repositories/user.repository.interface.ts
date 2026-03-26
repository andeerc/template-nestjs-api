import { User } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
}

export interface FindAllUsersFilters {
  id?: string;
  email?: string;
  name?: string;
  pageCount: number;
  recordsPerPage: number;
}

export interface FindAllUsersResult {
  data: User[];
  total: number;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(filters: FindAllUsersFilters): Promise<FindAllUsersResult>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
