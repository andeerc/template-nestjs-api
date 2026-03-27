import type { ReportColumn, ReportDocument, ReportSummaryItem } from '../types/report.types';
import { buildReportFileName, formatReportDate } from '../utils/report-value.util';

export abstract class BaseReportDefinition<TFilters, TRow> {
  protected abstract readonly key: string;
  protected abstract readonly title: string;

  async build(filters: TFilters): Promise<ReportDocument<TRow>> {
    const generatedAt = new Date();
    const rows = await this.getRows(filters);

    return {
      key: this.key,
      title: this.title,
      description: this.buildDescription(filters, rows),
      fileName: this.buildFileName(generatedAt),
      generatedAt,
      summary: this.buildSummary(filters, rows, generatedAt),
      columns: this.getColumns(),
      rows,
    };
  }

  protected buildDescription(_filters: TFilters, _rows: TRow[]): string | undefined {
    return undefined;
  }

  protected buildFileName(generatedAt: Date): string {
    return buildReportFileName(this.key, generatedAt);
  }

  protected buildSummary(
    _filters: TFilters,
    rows: TRow[],
    generatedAt: Date,
  ): ReportSummaryItem[] {
    return [
      {
        label: 'Gerado em',
        value: formatReportDate(generatedAt),
      },
      {
        label: 'Total de registros',
        value: String(rows.length),
      },
    ];
  }

  protected abstract getColumns(): ReportColumn<TRow>[];

  protected abstract getRows(filters: TFilters): Promise<TRow[]>;
}
