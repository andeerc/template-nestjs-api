import type { ReportCellValue, ReportColumn } from '../types/report.types';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

export function formatReportDate(value: Date): string {
  return DATE_TIME_FORMATTER.format(value);
}

export function formatReportValue(value: ReportCellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return formatReportDate(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Nao';
  }

  return String(value);
}

export function resolveColumnValue<TRow>(
  column: ReportColumn<TRow>,
  row: TRow,
): string {
  const rawValue = column.value
    ? column.value(row)
    : (row as Record<string, ReportCellValue>)[String(column.key)];

  if (column.format) {
    return column.format(rawValue, row);
  }

  return formatReportValue(rawValue);
}

export function buildReportFileName(baseName: string, generatedAt: Date): string {
  return `${slugifyFileName(baseName)}-${formatReportTimestamp(generatedAt)}`;
}

export function slugifyFileName(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'report';
}

function formatReportTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
