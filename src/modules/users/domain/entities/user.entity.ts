export class User {
	id: string;
	email: string;
	password?: string | null;
	googleId?: string | null;
	avatarUrl?: string | null;
	name: string;
	createdAt: Date;
	updatedAt: Date;

	constructor(partial: Partial<User> = {}) {
		Object.assign(this, partial);
	}
}

export type PublicUser = Omit<User, "password">;

export function toPublicUser(user: User): PublicUser {
	const publicUser = { ...user };
	delete publicUser.password;
	return publicUser;
}
