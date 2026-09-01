export type ReportFormat = "pdf" | "spreadsheet";

export type ReportCellValue =
	| string
	| number
	| boolean
	| Date
	| null
	| undefined;

export type ReportColumnAlignment = "left" | "center" | "right";

export interface ReportSummaryItem {
	label: string;
	value: string;
}

export interface ReportColumn<TRow> {
	key: keyof TRow | string;
	header: string;
	width?: number;
	align?: ReportColumnAlignment;
	value?: (row: TRow) => ReportCellValue;
	format?: (value: ReportCellValue, row: TRow) => string;
}

export interface ReportBrandingLogo {
	fileName: string;
	contentType: string;
	sizeBytes: number;
}

export interface ResolvedReportBrandingLogo extends ReportBrandingLogo {
	buffer: Buffer;
}

export interface ResolvedReportBranding {
	displayName: string;
	headerText?: string | null;
	footerText?: string | null;
	legalText?: string | null;
	primaryColor?: string | null;
	secondaryColor?: string | null;
	logo?: ResolvedReportBrandingLogo | null;
}

export interface ReportDocument<TRow> {
	key: string;
	title: string;
	description?: string;
	fileName: string;
	generatedAt: Date;
	summary: ReportSummaryItem[];
	columns: ReportColumn<TRow>[];
	rows: TRow[];
	organizationId?: string;
	branding?: ResolvedReportBranding;
}

export interface GeneratedReportFile {
	format: ReportFormat;
	buffer: Buffer;
	contentType: string;
	fileName: string;
}
