import { BadRequestException, Injectable } from '@nestjs/common';
import { PdfReportExporter } from '@/modules/reports/infrastructure/exporters/pdf-report.exporter';
import { SpreadsheetReportExporter } from '@/modules/reports/infrastructure/exporters/spreadsheet-report.exporter';
import type { IReportExporter } from '../contracts/report-exporter.interface';
import type { GeneratedReportFile, ReportDocument, ReportFormat } from '../types/report.types';

@Injectable()
export class ReportExportService {
  private readonly exporters: Record<ReportFormat, IReportExporter>;

  constructor(
    pdfExporter: PdfReportExporter,
    spreadsheetExporter: SpreadsheetReportExporter,
  ) {
    this.exporters = {
      pdf: pdfExporter,
      spreadsheet: spreadsheetExporter,
    };
  }

  async export<TRow>(
    document: ReportDocument<TRow>,
    format: ReportFormat,
  ): Promise<GeneratedReportFile> {
    const exporter = this.exporters[format];

    if (!exporter) {
      throw new BadRequestException(`Unsupported report format: ${format}`);
    }

    return exporter.export(document);
  }
}
