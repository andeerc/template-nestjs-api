import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';
import { EMAIL_JOB_SEND, EMAIL_QUEUE_NAME } from '../constants/email-queue.constants';
import { buildWelcomeEmail } from '../templates/welcome-email.template';
import type { SendEmailJobData, WelcomeEmailInput } from '../types/send-email-job.type';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME)
    private readonly emailQueue: Queue<SendEmailJobData>,
  ) {}

  async enqueue(input: SendEmailJobData): Promise<void> {
    await this.emailQueue.add(EMAIL_JOB_SEND, input);
  }

  async enqueueWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    await this.enqueue(buildWelcomeEmail(input));
  }
}
