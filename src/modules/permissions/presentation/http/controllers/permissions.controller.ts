import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { GetCurrentPermissionsUseCase } from "@/modules/permissions/application/use-cases/get-current-permissions.use-case";
import { GetPermissionCatalogUseCase } from "@/modules/permissions/application/use-cases/get-permission-catalog.use-case";
import {
	PermissionCatalogResponseDto,
	PermissionSnapshotResponseDto,
} from "@/modules/permissions/presentation/http/dtos";
import {
	ApiDoc,
	CurrentOrganization,
	CurrentUser,
} from "@/shared/http/decorators";
import { CurrentOrganizationGuard } from "@/shared/http/guards/current-organization.guard";
import { ResponseHelper } from "@/shared/http/helpers/response-helper";

@ApiTags("Permissions")
@Controller("permissions")
export class PermissionsController {
	constructor(
		private readonly getPermissionCatalogUseCase: GetPermissionCatalogUseCase,
		private readonly getCurrentPermissionsUseCase: GetCurrentPermissionsUseCase,
	) {}

	@Get("catalog")
	@ApiDoc({
		summary: "Get permissions catalog",
		response: PermissionCatalogResponseDto,
		commonResponses: ["unauthorized"],
	})
	async getCatalog() {
		const result = await this.getPermissionCatalogUseCase.execute();
		return ResponseHelper.success(result.data, result.message);
	}

	@Get("me")
	@UseGuards(CurrentOrganizationGuard)
	@ApiDoc({
		summary: "Get current user permissions for the selected organization",
		response: PermissionSnapshotResponseDto,
		commonResponses: ["unauthorized", "conflict", "notFound"],
	})
	async getCurrentPermissions(
		@CurrentUser("id") userId: string,
		@CurrentOrganization("id") organizationId: string,
	) {
		const result = await this.getCurrentPermissionsUseCase.execute(
			userId,
			organizationId,
		);

		return ResponseHelper.success(result.data, result.message);
	}
}
