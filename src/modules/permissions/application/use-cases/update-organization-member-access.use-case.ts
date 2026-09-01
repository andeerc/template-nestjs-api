import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
	type IPermissionsRepository,
	PERMISSIONS_REPOSITORY,
	type ReplaceOrganizationMemberAccessInput,
} from "@/modules/permissions/domain/repositories/permissions.repository.interface";

@Injectable()
export class UpdateOrganizationMemberAccessUseCase {
	constructor(
		@Inject(PERMISSIONS_REPOSITORY)
		private readonly permissionsRepository: IPermissionsRepository,
	) {}

	async execute(
		organizationId: string,
		userId: string,
		input: ReplaceOrganizationMemberAccessInput,
	) {
		const snapshot =
			await this.permissionsRepository.replaceOrganizationMemberAccess(
				userId,
				organizationId,
				input,
			);

		if (!snapshot) {
			throw new NotFoundException("Organization member access not found");
		}

		return {
			data: snapshot,
			message: "Organization member access updated successfully",
		};
	}
}
