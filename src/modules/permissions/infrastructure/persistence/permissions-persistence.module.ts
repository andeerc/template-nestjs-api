import { Module } from "@nestjs/common";
import { PERMISSIONS_REPOSITORY } from "@/modules/permissions/domain/repositories/permissions.repository.interface";
import { PermissionsRepository } from "./repositories/permissions.repository";

@Module({
	providers: [
		{
			provide: PERMISSIONS_REPOSITORY,
			useClass: PermissionsRepository,
		},
	],
	exports: [PERMISSIONS_REPOSITORY],
})
export class PermissionsPersistenceModule {}
