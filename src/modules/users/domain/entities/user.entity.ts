export class User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }
}

export type PublicUser = Omit<User, 'password'>;

export function toPublicUser(user: User): PublicUser {
  const { password: _, ...publicUser } = user;
  return publicUser;
}
