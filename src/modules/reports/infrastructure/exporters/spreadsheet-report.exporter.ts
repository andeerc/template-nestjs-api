import { Injectable } from '@nestjs/common';
import type { IReportExporter } from '@/modules/reports/application/contracts/report-exporter.interface';
import type { GeneratedReportFile, ReportDocument } from '@/modules/reports/application/types/report.types';
import { resolveColumnValue } from '@/modules/reports/application/utils/report-value.util';

const CSV_DELIMITER = ';';

@Injectable()
export class SpreadsheetReportExporter implements IReportExporter {
  readonly format = 'spreadsheet' as const;

  export<TRow>(document: ReportDocument<TRow>): GeneratedReportFile {
    const lines: string[][] = [[document.title]];

    if (document.description) {
      lines.push([document.description]);
    }

    lines.push(...document.summary.map((item) => [item.label, item.value]));
    lines.push([]);
    lines.push(document.columns.map(column => column.header));

    if (document.rows.length === 0) {
      lines.push(['Nenhum registro encontrado para os filtros informados.']);
    } else {
      document.rows.forEach((row) => {
        lines.push(
          document.columns.map(column => resolveColumnValue(column, row)),
        );
      });
    }

    const csvContent = lines
      .map(line => line.map(value => this.escapeCell(value)).join(CSV_DELIMITER))
      .join('\r\n');

    return {
      format: this.format,
      fileName: `${document.fileName}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(`\uFEFF${csvContent}`, 'utf8'),
    };
  }

  private escapeCell(value: string): string {
    if (value.includes('"')) {
      value = value.replace(/"/g, '""');
    }

    if (/[;"\r\n]/.test(value)) {
      return `"${value}"`;
    }

    return value;
  }
}
