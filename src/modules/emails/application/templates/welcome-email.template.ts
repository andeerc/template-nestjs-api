import { envConfig } from '@/config/env.config';
import type { SendEmailJobData, WelcomeEmailInput } from '../types/send-email-job.type';

export function buildWelcomeEmail(input: WelcomeEmailInput): SendEmailJobData {
  const appUrl = envConfig.email.appUrl.replace(/\/$/, '');
  const safeName = escapeHtml(input.name);

  return {
    to: input.email,
    subject: 'Welcome',
    text: [
      `Hello ${input.name},`,
      '',
      'Your account has been created successfully.',
      `Access the application: ${appUrl}`,
      '',
      'If you did not request this account, you can safely ignore this message.',
    ].join('\n'),
    html: [
      `<p>Hello ${safeName},</p>`,
      '<p>Your account has been created successfully.</p>',
      `<p><a href="${appUrl}">Access the application</a></p>`,
      '<p>If you did not request this account, you can safely ignore this message.</p>',
    ].join(''),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
