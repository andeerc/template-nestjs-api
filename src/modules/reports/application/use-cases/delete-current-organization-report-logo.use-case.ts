import { Inject, Injectable } from "@nestjs/common";
import {
	type IOrganizationReportSettingsRepository,
	ORGANIZATION_REPORT_SETTINGS_REPOSITORY,
} from "@/modules/reports/domain/repositories/organization-report-settings.repository.interface";

@Injectable()
export class DeleteCurrentOrganizationReportLogoUseCase {
	constructor(
		@Inject(ORGANIZATION_REPORT_SETTINGS_REPOSITORY)
		private readonly organizationReportSettingsRepository: IOrganizationReportSettingsRepository,
	) {}

	async execute(organizationId: string, updatedBy: string) {
		const settings = await this.organizationReportSettingsRepository.deleteLogo(
			organizationId,
			updatedBy,
		);

		return {
			data: settings,
			message: "Organization report logo removed successfully",
		};
	}
}
