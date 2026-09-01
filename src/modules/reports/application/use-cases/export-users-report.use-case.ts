import { Inject, Injectable } from "@nestjs/common";
import {
	type IOrganizationReportSettingsRepository,
	ORGANIZATION_REPORT_SETTINGS_REPOSITORY,
} from "@/modules/reports/domain/repositories/organization-report-settings.repository.interface";
import { UsersReportDefinition } from "../definitions/users-report.definition";
import { ReportExportService } from "../services/report-export.service";
import type {
	GeneratedReportFile,
	ReportFormat,
	ResolvedReportBranding,
} from "../types/report.types";

export interface ExportUsersReportFilters {
	id?: string;
	email?: string;
	name?: string;
	organizationId: string;
}

export interface ExportUsersReportInput extends ExportUsersReportFilters {
	format: ReportFormat;
	organizationName?: string;
}

@Injectable()
export class ExportUsersReportUseCase {
	constructor(
		@Inject(ORGANIZATION_REPORT_SETTINGS_REPOSITORY)
		private readonly organizationReportSettingsRepository: IOrganizationReportSettingsRepository,
		private readonly usersReportDefinition: UsersReportDefinition,
		private readonly reportExportService: ReportExportService,
	) {}

	async execute(input: ExportUsersReportInput): Promise<GeneratedReportFile> {
		const report = await this.usersReportDefinition.build({
			organizationId: input.organizationId,
			id: input.id,
			email: input.email,
			name: input.name,
		});
		const settings =
			await this.organizationReportSettingsRepository.findByOrganizationId(
				input.organizationId,
			);

		report.organizationId = input.organizationId;
		report.branding = this.resolveBranding(settings, input.organizationName);

		return this.reportExportService.export(report, input.format);
	}

	private resolveBranding(
		settings: Awaited<
			ReturnType<IOrganizationReportSettingsRepository["findByOrganizationId"]>
		>,
		organizationName?: string,
	): ResolvedReportBranding {
		return {
			displayName: settings?.displayName ?? organizationName ?? "Organização",
			headerText: settings?.headerText ?? null,
			footerText: settings?.footerText ?? null,
			legalText: settings?.legalText ?? null,
			primaryColor: settings?.primaryColor ?? null,
			secondaryColor: settings?.secondaryColor ?? null,
			logo:
				settings?.logoBlob &&
				settings.logoContentType &&
				settings.logoFileName &&
				settings.logoSizeBytes
					? {
							fileName: settings.logoFileName,
							contentType: settings.logoContentType,
							sizeBytes: settings.logoSizeBytes,
							buffer: settings.logoBlob,
						}
					: null,
		};
	}
}
