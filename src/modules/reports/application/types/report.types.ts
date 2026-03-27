export type ReportFormat = 'pdf' | 'spreadsheet';

export type ReportCellValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type ReportColumnAlignment = 'left' | 'center' | 'right';

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

export interface ReportDocument<TRow> {
  key: string;
  title: string;
  description?: string;
  fileName: string;
  generatedAt: Date;
  summary: ReportSummaryItem[];
  columns: ReportColumn<TRow>[];
  rows: TRow[];
}

export interface GeneratedReportFile {
  format: ReportFormat;
  buffer: Buffer;
  contentType: string;
  fileName: string;
}
