import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envConfig } from '@/config/env.config';
import type { SendEmailJobData } from '@/modules/emails/application/types/send-email-job.type';
import type { EmailSender } from '@/modules/emails/domain/services/email-sender.interface';

@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly transporter = nodemailer.createTransport({
    host: envConfig.email.smtp.host,
    port: envConfig.email.smtp.port,
    secure: envConfig.email.smtp.secure,
    auth: envConfig.email.smtp.auth,
  });

  async send(input: SendEmailJobData): Promise<void> {
    await this.transporter.sendMail({
      from: input.from ?? envConfig.email.from,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
