import type { GeneratedReportFile, ReportDocument, ReportFormat } from '../types/report.types';

export interface IReportExporter {
  readonly format: ReportFormat;
  export<TRow>(document: ReportDocument<TRow>): GeneratedReportFile;
}
