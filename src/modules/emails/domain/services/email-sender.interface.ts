import type { SendEmailJobData } from '@/modules/emails/application/types/send-email-job.type';

export interface EmailSender {
  send(input: SendEmailJobData): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
