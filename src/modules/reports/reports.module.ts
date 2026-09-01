import { Module } from "@nestjs/common";
import { OrganizationsPersistenceModule } from "@/modules/organizations/infrastructure/persistence/organizations-persistence.module";
import { PermissionsPersistenceModule } from "@/modules/permissions/infrastructure/persistence/permissions-persistence.module";
import { PermissionsModule } from "@/modules/permissions/permissions.module";
import { UsersPersistenceModule } from "@/modules/users/infrastructure/persistence/users-persistence.module";
import { UsersReportDefinition } from "./application/definitions/users-report.definition";
import { ReportExportService } from "./application/services/report-export.service";
import { DeleteCurrentOrganizationReportLogoUseCase } from "./application/use-cases/delete-current-organization-report-logo.use-case";
import { ExportUsersReportUseCase } from "./application/use-cases/export-users-report.use-case";
import { GetCurrentOrganizationReportSettingsUseCase } from "./application/use-cases/get-current-organization-report-settings.use-case";
import { UpdateCurrentOrganizationReportSettingsUseCase } from "./application/use-cases/update-current-organization-report-settings.use-case";
import { UploadCurrentOrganizationReportLogoUseCase } from "./application/use-cases/upload-current-organization-report-logo.use-case";
import { ORGANIZATION_REPORT_SETTINGS_REPOSITORY } from "./domain/repositories/organization-report-settings.repository.interface";
import { PdfReportExporter } from "./infrastructure/exporters/pdf-report.exporter";
import { SpreadsheetReportExporter } from "./infrastructure/exporters/spreadsheet-report.exporter";
import { OrganizationReportSettingsRepository } from "./infrastructure/persistence/repositories/organization-report-settings.repository";
import { OrganizationReportSettingsController } from "./presentation/http/controllers/organization-report-settings.controller";
import { ReportsController } from "./presentation/http/controllers/reports.controller";

@Module({
	imports: [
		UsersPersistenceModule,
		OrganizationsPersistenceModule,
		PermissionsPersistenceModule,
		PermissionsModule,
	],
	controllers: [ReportsController, OrganizationReportSettingsController],
	providers: [
		{
			provide: ORGANIZATION_REPORT_SETTINGS_REPOSITORY,
			useClass: OrganizationReportSettingsRepository,
		},
		UsersReportDefinition,
		ReportExportService,
		ExportUsersReportUseCase,
		GetCurrentOrganizationReportSettingsUseCase,
		UpdateCurrentOrganizationReportSettingsUseCase,
		UploadCurrentOrganizationReportLogoUseCase,
		DeleteCurrentOrganizationReportLogoUseCase,
		PdfReportExporter,
		SpreadsheetReportExporter,
	],
})
export class ReportsModule {}
