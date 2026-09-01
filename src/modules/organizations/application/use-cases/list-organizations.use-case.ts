import { Inject, Injectable } from "@nestjs/common";
import {
	type IOrganizationRepository,
	ORGANIZATION_REPOSITORY,
} from "@/modules/organizations/domain/repositories/organization.repository.interface";

@Injectable()
export class ListOrganizationsUseCase {
	constructor(
		@Inject(ORGANIZATION_REPOSITORY)
		private readonly organizationRepository: IOrganizationRepository,
	) {}

	async execute(userId: string) {
		const organizations = await this.organizationRepository.listForUser(userId);

		return {
			data: organizations,
			message: "Organizations retrieved successfully",
		};
	}
}
