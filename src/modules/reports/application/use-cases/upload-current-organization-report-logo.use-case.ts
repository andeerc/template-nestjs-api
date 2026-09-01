import { Inject, Injectable } from "@nestjs/common";
import {
	type IOrganizationReportSettingsRepository,
	ORGANIZATION_REPORT_SETTINGS_REPOSITORY,
	type UploadOrganizationReportLogoInput,
} from "@/modules/reports/domain/repositories/organization-report-settings.repository.interface";

@Injectable()
export class UploadCurrentOrganizationReportLogoUseCase {
	constructor(
		@Inject(ORGANIZATION_REPORT_SETTINGS_REPOSITORY)
		private readonly organizationReportSettingsRepository: IOrganizationReportSettingsRepository,
	) {}

	async execute(
		organizationId: string,
		updatedBy: string,
		input: UploadOrganizationReportLogoInput,
	) {
		const settings = await this.organizationReportSettingsRepository.upsertLogo(
			organizationId,
			updatedBy,
			input,
		);

		return {
			data: settings,
			message: "Organization report logo updated successfully",
		};
	}
}
