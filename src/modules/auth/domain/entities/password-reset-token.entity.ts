export class PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;

  constructor(partial: Partial<PasswordResetToken> = {}) {
    Object.assign(this, partial);
  }
}
