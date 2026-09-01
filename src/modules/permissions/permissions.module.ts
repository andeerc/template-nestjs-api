import { Module } from "@nestjs/common";
import { OrganizationsPersistenceModule } from "@/modules/organizations/infrastructure/persistence/organizations-persistence.module";
import { CurrentOrganizationGuard } from "@/shared/http/guards/current-organization.guard";
import { PermissionsGuard } from "@/shared/http/guards/permissions.guard";
import { PermissionsContextInterceptor } from "./application/interceptors/permissions-context.interceptor";
import { PermissionsAbilityFactory } from "./application/services/permissions-ability.factory";
import { PermissionsRequestContextService } from "./application/services/permissions-request-context.service";
import { GetCurrentPermissionsUseCase } from "./application/use-cases/get-current-permissions.use-case";
import { GetOrganizationMemberAccessUseCase } from "./application/use-cases/get-organization-member-access.use-case";
import { GetPermissionCatalogUseCase } from "./application/use-cases/get-permission-catalog.use-case";
import { UpdateOrganizationMemberAccessUseCase } from "./application/use-cases/update-organization-member-access.use-case";
import { PermissionsPersistenceModule } from "./infrastructure/persistence/permissions-persistence.module";
import { OrganizationMemberAccessController } from "./presentation/http/controllers/organization-member-access.controller";
import { PermissionsController } from "./presentation/http/controllers/permissions.controller";

@Module({
	imports: [OrganizationsPersistenceModule, PermissionsPersistenceModule],
	controllers: [PermissionsController, OrganizationMemberAccessController],
	providers: [
		PermissionsRequestContextService,
		PermissionsContextInterceptor,
		PermissionsAbilityFactory,
		GetPermissionCatalogUseCase,
		GetCurrentPermissionsUseCase,
		GetOrganizationMemberAccessUseCase,
		UpdateOrganizationMemberAccessUseCase,
		CurrentOrganizationGuard,
		PermissionsGuard,
	],
	exports: [
		PermissionsRequestContextService,
		PermissionsContextInterceptor,
		PermissionsAbilityFactory,
		CurrentOrganizationGuard,
		PermissionsGuard,
	],
})
export class PermissionsModule {}
