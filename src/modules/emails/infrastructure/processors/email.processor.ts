import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EMAIL_JOB_SEND, EMAIL_QUEUE_NAME } from '../../application/constants/email-queue.constants';
import type { SendEmailJobData } from '../../application/types/send-email-job.type';
import { EMAIL_SENDER } from '../../domain/services/email-sender.interface';
import type { EmailSender } from '../../domain/services/email-sender.interface';

@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
  ) {}

  @Process(EMAIL_JOB_SEND)
  async handleSendEmail(job: Job<SendEmailJobData>): Promise<void> {
    await this.emailSender.send(job.data);

    this.logger.log(`Email job ${job.id} sent to ${formatRecipients(job.data.to)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<SendEmailJobData>, error: Error): void {
    const jobId = job?.id ?? 'unknown';

    this.logger.error(`Email job ${jobId} failed: ${error.message}`, error.stack);
  }
}

function formatRecipients(recipients: string | string[]): string {
  return Array.isArray(recipients) ? recipients.join(', ') : recipients;
}
