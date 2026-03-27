import { createHash, randomBytes } from 'crypto';

export function generatePasswordResetToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString('hex');

  return {
    rawToken,
    tokenHash: hashPasswordResetToken(rawToken),
  };
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
