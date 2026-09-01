import { Module } from "@nestjs/common";
import { CreateOrganizationUseCase } from "./application/use-cases/create-organization.use-case";
import { GetCurrentOrganizationUseCase } from "./application/use-cases/get-current-organization.use-case";
import { ListOrganizationsUseCase } from "./application/use-cases/list-organizations.use-case";
import { SwitchCurrentOrganizationUseCase } from "./application/use-cases/switch-current-organization.use-case";
import { OrganizationsPersistenceModule } from "./infrastructure/persistence/organizations-persistence.module";
import { OrganizationsController } from "./presentation/http/controllers/organizations.controller";

@Module({
	imports: [OrganizationsPersistenceModule],
	providers: [
		CreateOrganizationUseCase,
		ListOrganizationsUseCase,
		GetCurrentOrganizationUseCase,
		SwitchCurrentOrganizationUseCase,
	],
	controllers: [OrganizationsController],
})
export class OrganizationsModule {}
