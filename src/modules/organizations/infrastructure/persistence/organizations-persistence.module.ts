import { Module } from "@nestjs/common";
import { ORGANIZATION_REPOSITORY } from "@/modules/organizations/domain/repositories/organization.repository.interface";
import { OrganizationRepository } from "./repositories/organization.repository";

@Module({
	providers: [
		{
			provide: ORGANIZATION_REPOSITORY,
			useClass: OrganizationRepository,
		},
	],
	exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsPersistenceModule {}
