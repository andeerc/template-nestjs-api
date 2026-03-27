import { Injectable } from '@nestjs/common';
import type { IReportExporter } from '@/modules/reports/application/contracts/report-exporter.interface';
import type {
  GeneratedReportFile,
  ReportColumn,
  ReportColumnAlignment,
  ReportDocument,
} from '@/modules/reports/application/types/report.types';
import { resolveColumnValue } from '@/modules/reports/application/utils/report-value.util';

const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_MARGIN = 40;
const PDF_LINE_HEIGHT = 14;
const PDF_MAX_LINES_PER_PAGE = 50;
const PDF_MAX_TEXT_LENGTH = 84;

@Injectable()
export class PdfReportExporter implements IReportExporter {
  readonly format = 'pdf' as const;

  export<TRow>(document: ReportDocument<TRow>): GeneratedReportFile {
    const lines = this.buildLines(document);
    const pages = this.chunkLines(lines);

    return {
      format: this.format,
      fileName: `${document.fileName}.pdf`,
      contentType: 'application/pdf',
      buffer: this.buildPdfBuffer(pages),
    };
  }

  private buildLines<TRow>(document: ReportDocument<TRow>): string[] {
    const headerLines = [
      ...this.wrapText(document.title),
      ...(document.description ? this.wrapText(document.description) : []),
      '',
      ...document.summary.flatMap(item =>
        this.wrapText(`${item.label}: ${item.value}`),
      ),
      '',
    ];

    return [...headerLines, ...this.buildTableLines(document)];
  }

  private buildTableLines<TRow>(document: ReportDocument<TRow>): string[] {
    const columns = document.columns;
    const widths = columns.map(column => this.resolveColumnWidth(column));
    const header = this.renderTableRow(
      columns.map(column => column.header),
      columns,
      widths,
    );
    const separator = widths.map(width => '-'.repeat(width)).join('-+-');

    if (document.rows.length === 0) {
      return [
        header,
        separator,
        'Nenhum registro encontrado para os filtros informados.',
      ];
    }

    return [
      header,
      separator,
      ...document.rows.map(row =>
        this.renderTableRow(
          columns.map(column => resolveColumnValue(column, row)),
          columns,
          widths,
        ),
      ),
    ];
  }

  private renderTableRow<TRow>(
    values: string[],
    columns: ReportColumn<TRow>[],
    widths: number[],
  ): string {
    return values
      .map((value, index) => {
        const column = columns[index];
        return this.fitCell(value, widths[index], column.align ?? 'left');
      })
      .join(' | ');
  }

  private fitCell(
    value: string,
    width: number,
    align: ReportColumnAlignment,
  ): string {
    const normalizedValue = value.replace(/\s+/g, ' ').trim();
    const clippedValue = normalizedValue.length > width
      ? `${normalizedValue.slice(0, Math.max(width - 3, 0))}...`
      : normalizedValue;
    const padding = Math.max(width - clippedValue.length, 0);

    if (align === 'right') {
      return `${' '.repeat(padding)}${clippedValue}`;
    }

    if (align === 'center') {
      const leftPadding = Math.floor(padding / 2);
      const rightPadding = padding - leftPadding;
      return `${' '.repeat(leftPadding)}${clippedValue}${' '.repeat(rightPadding)}`;
    }

    return `${clippedValue}${' '.repeat(padding)}`;
  }

  private resolveColumnWidth<TRow>(column: ReportColumn<TRow>): number {
    return Math.max(column.width ?? column.header.length, column.header.length);
  }

  private wrapText(value: string, maxLength = PDF_MAX_TEXT_LENGTH): string[] {
    const normalizedValue = value.replace(/\s+/g, ' ').trim();

    if (!normalizedValue) {
      return [''];
    }

    const words = normalizedValue.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (nextLine.length <= maxLength) {
        currentLine = nextLine;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  private chunkLines(lines: string[]): string[][] {
    if (lines.length === 0) {
      return [[]];
    }

    const pages: string[][] = [];

    for (let index = 0; index < lines.length; index += PDF_MAX_LINES_PER_PAGE) {
      pages.push(lines.slice(index, index + PDF_MAX_LINES_PER_PAGE));
    }

    return pages;
  }

  private buildPdfBuffer(pages: string[][]): Buffer {
    const objects: string[] = [];
    const addObject = (value: string) => {
      objects.push(value);
      return objects.length;
    };

    const fontId = addObject(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>',
    );
    const pagesId = addObject('');
    const pageIds: number[] = [];
    const contentIds: number[] = [];

    pages.forEach((pageLines) => {
      const pageStream = this.buildPageStream(pageLines);
      const contentId = addObject(
        `<< /Length ${Buffer.byteLength(pageStream, 'latin1')} >>\nstream\n${pageStream}\nendstream`,
      );
      const pageId = addObject('');

      contentIds.push(contentId);
      pageIds.push(pageId);
    });

    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
      .map(pageId => `${pageId} 0 R`)
      .join(' ')}] >>`;

    pageIds.forEach((pageId, index) => {
      objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`;
    });

    return this.serializePdf(objects, catalogId);
  }

  private buildPageStream(lines: string[]): string {
    const safeLines = lines.length > 0 ? lines : [''];
    const commands = ['BT', '/F1 10 Tf', `${PDF_MARGIN} ${PDF_PAGE_HEIGHT - PDF_MARGIN} Td`];

    safeLines.forEach((line, index) => {
      if (index > 0) {
        commands.push(`0 -${PDF_LINE_HEIGHT} Td`);
      }

      commands.push(`(${this.escapePdfText(line)}) Tj`);
    });

    commands.push('ET');

    return commands.join('\n');
  }

  private serializePdf(objects: string[], rootId: number): Buffer {
    const header = Buffer.from('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n', 'latin1');
    const buffers: Buffer[] = [header];
    const offsets = new Array<number>(objects.length + 1).fill(0);
    let currentOffset = header.length;

    objects.forEach((content, index) => {
      const objectBuffer = Buffer.from(
        `${index + 1} 0 obj\n${content}\nendobj\n`,
        'latin1',
      );

      offsets[index + 1] = currentOffset;
      currentOffset += objectBuffer.length;
      buffers.push(objectBuffer);
    });

    const xrefOffset = currentOffset;
    const xrefLines = [
      'xref',
      `0 ${objects.length + 1}`,
      '0000000000 65535 f ',
      ...offsets
        .slice(1)
        .map(offset => `${String(offset).padStart(10, '0')} 00000 n `),
      'trailer',
      `<< /Size ${objects.length + 1} /Root ${rootId} 0 R >>`,
      'startxref',
      String(xrefOffset),
      '%%EOF',
    ];

    buffers.push(Buffer.from(`${xrefLines.join('\n')}\n`, 'latin1'));

    return Buffer.concat(buffers);
  }

  private escapePdfText(value: string): string {
    return Array.from(value.replace(/\r?\n/g, ' '))
      .map((character) => {
        const code = character.codePointAt(0) ?? 63;

        if (code > 255) {
          return '?';
        }

        if (character === '\\' || character === '(' || character === ')') {
          return `\\${character}`;
        }

        return character;
      })
      .join('');
  }
}
