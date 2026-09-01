import { Inject, Injectable } from "@nestjs/common";
import {
	type IPermissionsRepository,
	PERMISSIONS_REPOSITORY,
} from "@/modules/permissions/domain/repositories/permissions.repository.interface";

@Injectable()
export class GetPermissionCatalogUseCase {
	constructor(
		@Inject(PERMISSIONS_REPOSITORY)
		private readonly permissionsRepository: IPermissionsRepository,
	) {}

	async execute() {
		const catalog = await this.permissionsRepository.getCatalog();

		return {
			data: catalog,
			message: "Permission catalog retrieved successfully",
		};
	}
}
