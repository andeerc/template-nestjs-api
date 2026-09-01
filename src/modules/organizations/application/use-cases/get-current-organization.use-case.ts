import { Inject, Injectable } from "@nestjs/common";
import {
	type IOrganizationRepository,
	ORGANIZATION_REPOSITORY,
} from "@/modules/organizations/domain/repositories/organization.repository.interface";

@Injectable()
export class GetCurrentOrganizationUseCase {
	constructor(
		@Inject(ORGANIZATION_REPOSITORY)
		private readonly organizationRepository: IOrganizationRepository,
	) {}

	async execute(userId: string, organizationId?: string) {
		if (!organizationId) {
			return {
				data: null,
				message: "No active organization in the current session",
			};
		}

		const organization =
			await this.organizationRepository.findAccessibleByIdForUser(
				organizationId,
				userId,
			);

		return {
			data: organization,
			message: organization
				? "Current organization retrieved successfully"
				: "Current organization is no longer available for this user",
		};
	}
}
