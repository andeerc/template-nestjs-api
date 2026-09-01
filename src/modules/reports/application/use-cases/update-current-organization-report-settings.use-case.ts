import { Inject, Injectable } from "@nestjs/common";
import {
	type IOrganizationReportSettingsRepository,
	ORGANIZATION_REPORT_SETTINGS_REPOSITORY,
	type UpdateOrganizationReportSettingsInput,
} from "@/modules/reports/domain/repositories/organization-report-settings.repository.interface";

@Injectable()
export class UpdateCurrentOrganizationReportSettingsUseCase {
	constructor(
		@Inject(ORGANIZATION_REPORT_SETTINGS_REPOSITORY)
		private readonly organizationReportSettingsRepository: IOrganizationReportSettingsRepository,
	) {}

	async execute(
		organizationId: string,
		updatedBy: string,
		input: UpdateOrganizationReportSettingsInput,
	) {
		const settings =
			await this.organizationReportSettingsRepository.upsertSettings(
				organizationId,
				updatedBy,
				input,
			);

		return {
			data: settings,
			message: "Organization report settings updated successfully",
		};
	}
}
