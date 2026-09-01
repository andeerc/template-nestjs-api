export interface OrganizationReportSettings {
	organizationId: string;
	displayName?: string | null;
	headerText?: string | null;
	footerText?: string | null;
	legalText?: string | null;
	primaryColor?: string | null;
	secondaryColor?: string | null;
	logoFileName?: string | null;
	logoContentType?: string | null;
	logoSizeBytes?: number | null;
	logoBlob?: Buffer | null;
	updatedBy?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface UpdateOrganizationReportSettingsInput {
	displayName?: string | null;
	headerText?: string | null;
	footerText?: string | null;
	legalText?: string | null;
	primaryColor?: string | null;
	secondaryColor?: string | null;
}

export interface UploadOrganizationReportLogoInput {
	fileName: string;
	contentType: string;
	sizeBytes: number;
	blob: Buffer;
}

export interface IOrganizationReportSettingsRepository {
	findByOrganizationId(
		organizationId: string,
	): Promise<OrganizationReportSettings | null>;
	upsertSettings(
		organizationId: string,
		updatedBy: string,
		input: UpdateOrganizationReportSettingsInput,
	): Promise<OrganizationReportSettings>;
	upsertLogo(
		organizationId: string,
		updatedBy: string,
		input: UploadOrganizationReportLogoInput,
	): Promise<OrganizationReportSettings>;
	deleteLogo(
		organizationId: string,
		updatedBy: string,
	): Promise<OrganizationReportSettings>;
}

export const ORGANIZATION_REPORT_SETTINGS_REPOSITORY = Symbol(
	"ORGANIZATION_REPORT_SETTINGS_REPOSITORY",
);
