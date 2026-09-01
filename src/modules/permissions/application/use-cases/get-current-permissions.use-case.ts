import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
	type IPermissionsRepository,
	PERMISSIONS_REPOSITORY,
} from "@/modules/permissions/domain/repositories/permissions.repository.interface";

@Injectable()
export class GetCurrentPermissionsUseCase {
	constructor(
		@Inject(PERMISSIONS_REPOSITORY)
		private readonly permissionsRepository: IPermissionsRepository,
	) {}

	async execute(userId: string, organizationId: string) {
		const snapshot =
			await this.permissionsRepository.getPermissionSnapshotForUser(
				userId,
				organizationId,
			);

		if (!snapshot) {
			throw new NotFoundException(
				"Current organization member access not found",
			);
		}

		return {
			data: snapshot,
			message: "Current permissions retrieved successfully",
		};
	}
}
