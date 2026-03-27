export interface SendEmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface WelcomeEmailInput {
  email: string;
  name: string;
}

export interface PasswordResetEmailInput {
  email: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}
