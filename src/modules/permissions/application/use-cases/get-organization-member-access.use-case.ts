import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
	type IPermissionsRepository,
	PERMISSIONS_REPOSITORY,
} from "@/modules/permissions/domain/repositories/permissions.repository.interface";

@Injectable()
export class GetOrganizationMemberAccessUseCase {
	constructor(
		@Inject(PERMISSIONS_REPOSITORY)
		private readonly permissionsRepository: IPermissionsRepository,
	) {}

	async execute(organizationId: string, userId: string) {
		const snapshot =
			await this.permissionsRepository.getPermissionSnapshotForUser(
				userId,
				organizationId,
			);

		if (!snapshot) {
			throw new NotFoundException("Organization member access not found");
		}

		return {
			data: snapshot,
			message: "Organization member access retrieved successfully",
		};
	}
}
