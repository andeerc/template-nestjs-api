import type { PasswordResetEmailInput, SendEmailJobData } from '../types/send-email-job.type';

export function buildPasswordResetEmail(input: PasswordResetEmailInput): SendEmailJobData {
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.resetUrl);

  return {
    to: input.email,
    subject: 'Reset your password',
    text: [
      `Hello ${input.name},`,
      '',
      'We received a request to reset your password.',
      `Use the link below to choose a new password: ${input.resetUrl}`,
      `This link expires in ${input.expiresInMinutes} minutes.`,
      '',
      'If you did not request this change, you can safely ignore this message.',
    ].join('\n'),
    html: [
      `<p>Hello ${safeName},</p>`,
      '<p>We received a request to reset your password.</p>',
      `<p><a href="${safeUrl}">Reset password</a></p>`,
      `<p>This link expires in ${input.expiresInMinutes} minutes.</p>`,
      '<p>If you did not request this change, you can safely ignore this message.</p>',
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
