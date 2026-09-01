import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import type { Queue } from "bull";
import { envConfig } from "@/config/env.config";
import {
	EMAIL_JOB_SEND,
	EMAIL_QUEUE_NAME,
} from "../constants/email-queue.constants";
import { buildPasswordResetEmail } from "../templates/password-reset-email.template";
import { buildWelcomeEmail } from "../templates/welcome-email.template";
import type {
	PasswordResetEmailInput,
	SendEmailJobData,
	WelcomeEmailInput,
} from "../types/send-email-job.type";

@Injectable()
export class EmailQueueService {
	private readonly logger = new Logger(EmailQueueService.name);

	constructor(
		@InjectQueue(EMAIL_QUEUE_NAME)
		private readonly emailQueue: Queue<SendEmailJobData>,
	) {}

	async enqueue(input: SendEmailJobData): Promise<void> {
		if (!envConfig.email.enabled) {
			this.logger.warn(
				`Email delivery is disabled. Skipping queued email for ${formatRecipients(input.to)}`,
			);
			return;
		}

		await this.emailQueue.add(EMAIL_JOB_SEND, input);
	}

	async enqueueWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
		await this.enqueue(buildWelcomeEmail(input));
	}

	async enqueuePasswordResetEmail(
		input: PasswordResetEmailInput,
	): Promise<void> {
		await this.enqueue(buildPasswordResetEmail(input));
	}
}

function formatRecipients(recipients: string | string[]): string {
	return Array.isArray(recipients) ? recipients.join(", ") : recipients;
}
