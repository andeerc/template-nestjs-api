import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { EMAIL_QUEUE_NAME } from './application/constants/email-queue.constants';
import { EmailQueueService } from './application/services/email-queue.service';
import { EMAIL_SENDER } from './domain/services/email-sender.interface';
import { EmailProcessor } from './infrastructure/processors/email.processor';
import { SmtpEmailSender } from './infrastructure/senders/smtp-email.sender';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  providers: [
    EmailQueueService,
    EmailProcessor,
    {
      provide: EMAIL_SENDER,
      useClass: SmtpEmailSender,
    },
  ],
  exports: [EmailQueueService],
})
export class EmailsModule {}
