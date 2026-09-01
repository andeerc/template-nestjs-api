import { Injectable, Logger } from "@nestjs/common";
import type { SendEmailJobData } from "@/modules/emails/application/types/send-email-job.type";
import type { EmailSender } from "@/modules/emails/domain/services/email-sender.interface";

@Injectable()
export class NoopEmailSender implements EmailSender {
	private readonly logger = new Logger(NoopEmailSender.name);

	// eslint-disable-next-line @typescript-eslint/require-await
	async send(input: SendEmailJobData): Promise<void> {
		this.logger.warn(
			`Email delivery is disabled. Discarding email for ${formatRecipients(input.to)}`,
		);
	}
}

function formatRecipients(recipients: string | string[]): string {
	return Array.isArray(recipients) ? recipients.join(", ") : recipients;
}
