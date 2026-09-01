import { User } from "../entities/user.entity";

export interface CreateUserData {
	email: string;
	password?: string | null;
	googleId?: string | null;
	avatarUrl?: string | null;
	name: string;
}

export interface UpdateUserData {
	email?: string;
	password?: string | null;
	googleId?: string | null;
	avatarUrl?: string | null;
	name?: string;
}

export interface FindAllUsersFilters {
	id?: string;
	email?: string;
	name?: string;
	organizationId?: string;
	pageCount?: number;
	recordsPerPage?: number;
	paginate?: boolean;
}

export interface FindAllUsersResult {
	data: User[];
	total: number;
}

export interface IUserRepository {
	findByEmail(email: string): Promise<User | null>;
	findByGoogleId(googleId: string): Promise<User | null>;
	findById(id: string, organizationId?: string): Promise<User | null>;
	findAll(filters: FindAllUsersFilters): Promise<FindAllUsersResult>;
	create(data: CreateUserData): Promise<User>;
	update(id: string, data: UpdateUserData): Promise<User | null>;
	delete(id: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol("IUserRepository");
