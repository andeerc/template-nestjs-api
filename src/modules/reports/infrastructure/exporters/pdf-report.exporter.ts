import { Injectable } from "@nestjs/common";
import {
	PDFDocument,
	type PDFFont,
	type PDFImage,
	type PDFPage,
	rgb,
	StandardFonts,
} from "pdf-lib";
import type { IReportExporter } from "@/modules/reports/application/contracts/report-exporter.interface";
import type {
	GeneratedReportFile,
	ReportColumn,
	ReportColumnAlignment,
	ReportDocument,
	ResolvedReportBranding,
} from "@/modules/reports/application/types/report.types";
import { resolveColumnValue } from "@/modules/reports/application/utils/report-value.util";

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 40;
const PDF_BODY_BOTTOM = 92;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
const PDF_LOGO_MAX_WIDTH = 60;
const PDF_LOGO_MAX_HEIGHT = 60;
const PDF_TITLE_SIZE = 16;
const PDF_BODY_FONT_SIZE = 10;
const PDF_SUMMARY_FONT_SIZE = 9;
const PDF_TABLE_FONT_SIZE = 8;
const PDF_TABLE_HEADER_HEIGHT = 20;
const PDF_TABLE_CELL_PADDING = 4;
const PDF_TABLE_LINE_HEIGHT = 10;
const PDF_SECTION_GAP = 12;

interface PageContext {
	page: PDFPage;
	cursorY: number;
}

@Injectable()
export class PdfReportExporter implements IReportExporter {
	readonly format = "pdf" as const;

	async export<TRow>(
		document: ReportDocument<TRow>,
	): Promise<GeneratedReportFile> {
		const pdfDocument = await PDFDocument.create();
		const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
		const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
		const embeddedLogo = await this.embedLogo(pdfDocument, document.branding);
		const colors = this.resolveColors(document.branding);
		const pageContext = this.createPage(
			pdfDocument,
			document,
			regularFont,
			boldFont,
			embeddedLogo,
			colors,
		);

		const ensureSpace = (height: number, shouldRedrawTableHeader = false) => {
			if (pageContext.cursorY - height >= PDF_BODY_BOTTOM) {
				return;
			}

			const nextPageContext = this.createPage(
				pdfDocument,
				document,
				regularFont,
				boldFont,
				embeddedLogo,
				colors,
			);
			pageContext.page = nextPageContext.page;
			pageContext.cursorY = nextPageContext.cursorY;

			if (shouldRedrawTableHeader) {
				pageContext.cursorY = this.drawTableHeader(
					pageContext.page,
					document.columns,
					boldFont,
					pageContext.cursorY,
					colors.primary,
					colors.secondary,
				);
			}
		};

		pageContext.cursorY = this.drawIntro(
			pageContext,
			document,
			regularFont,
			boldFont,
			colors.primary,
			ensureSpace,
		);

		pageContext.cursorY = this.drawTableHeader(
			pageContext.page,
			document.columns,
			boldFont,
			pageContext.cursorY,
			colors.primary,
			colors.secondary,
		);

		if (document.rows.length === 0) {
			ensureSpace(PDF_TABLE_LINE_HEIGHT + PDF_SECTION_GAP, true);
			pageContext.cursorY = this.drawWrappedText(
				pageContext.page,
				["Nenhum registro encontrado para os filtros informados."],
				regularFont,
				PDF_BODY_FONT_SIZE,
				PDF_MARGIN,
				pageContext.cursorY,
				PDF_CONTENT_WIDTH,
			);
		} else {
			for (const row of document.rows) {
				const renderedCells = this.renderRowCells(
					row,
					document.columns,
					regularFont,
				);
				const rowHeight = this.calculateRowHeight(renderedCells);

				ensureSpace(rowHeight + 4, true);
				this.drawTableRow(
					pageContext.page,
					document.columns,
					renderedCells,
					regularFont,
					pageContext.cursorY,
					rowHeight,
					colors.secondary,
				);
				pageContext.cursorY -= rowHeight;
			}
		}

		return {
			format: this.format,
			fileName: `${document.fileName}.pdf`,
			contentType: "application/pdf",
			buffer: Buffer.from(await pdfDocument.save()),
		};
	}

	private createPage<TRow>(
		pdfDocument: PDFDocument,
		document: ReportDocument<TRow>,
		regularFont: PDFFont,
		boldFont: PDFFont,
		embeddedLogo: PDFImage | null,
		colors: {
			primary: ReturnType<typeof rgb>;
			secondary: ReturnType<typeof rgb>;
		},
	): PageContext {
		const page = pdfDocument.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
		const cursorY = this.drawPageChrome(
			page,
			document,
			regularFont,
			boldFont,
			embeddedLogo,
			colors,
		);

		return { page, cursorY };
	}

	private drawPageChrome<TRow>(
		page: PDFPage,
		document: ReportDocument<TRow>,
		regularFont: PDFFont,
		boldFont: PDFFont,
		embeddedLogo: PDFImage | null,
		colors: {
			primary: ReturnType<typeof rgb>;
			secondary: ReturnType<typeof rgb>;
		},
	): number {
		const branding = document.branding;
		let textX = PDF_MARGIN;
		let textWidth = PDF_CONTENT_WIDTH;
		const topY = PDF_PAGE_HEIGHT - PDF_MARGIN;

		if (embeddedLogo) {
			const scaledLogo = this.scaleLogo(embeddedLogo);
			page.drawImage(embeddedLogo, {
				x: PDF_MARGIN,
				y: topY - scaledLogo.height,
				width: scaledLogo.width,
				height: scaledLogo.height,
			});
			textX += scaledLogo.width + 16;
			textWidth -= scaledLogo.width + 16;
		}

		page.drawText(branding?.displayName ?? "Organização", {
			x: textX,
			y: topY - 14,
			font: boldFont,
			size: 15,
			color: colors.primary,
		});

		const headerLines = branding?.headerText
			? this.wrapTextByWidth(
					regularFont,
					branding.headerText,
					PDF_BODY_FONT_SIZE,
					textWidth,
				)
			: [];

		let cursorY = topY - 30;
		headerLines.slice(0, 3).forEach((line) => {
			page.drawText(line, {
				x: textX,
				y: cursorY,
				font: regularFont,
				size: PDF_BODY_FONT_SIZE,
				color: colors.secondary,
			});
			cursorY -= PDF_BODY_FONT_SIZE + 2;
		});

		page.drawLine({
			start: { x: PDF_MARGIN, y: cursorY - 6 },
			end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: cursorY - 6 },
			thickness: 1,
			color: colors.secondary,
		});

		this.drawFooter(page, branding, regularFont, colors.secondary);

		return cursorY - 24;
	}

	private drawFooter(
		page: PDFPage,
		branding: ResolvedReportBranding | undefined,
		regularFont: PDFFont,
		color: ReturnType<typeof rgb>,
	): void {
		const footerLines = [
			...(branding?.footerText
				? this.wrapTextByWidth(
						regularFont,
						branding.footerText,
						8,
						PDF_CONTENT_WIDTH,
					)
				: []),
			...(branding?.legalText
				? this.wrapTextByWidth(
						regularFont,
						branding.legalText,
						7,
						PDF_CONTENT_WIDTH,
					)
				: []),
		];

		if (footerLines.length === 0) {
			return;
		}

		let cursorY = PDF_MARGIN + 26;

		footerLines
			.slice(0, 3)
			.reverse()
			.forEach((line) => {
				page.drawText(line, {
					x: PDF_MARGIN,
					y: cursorY,
					font: regularFont,
					size: 7,
					color,
				});
				cursorY += 10;
			});
	}

	private drawIntro<TRow>(
		pageContext: PageContext,
		document: ReportDocument<TRow>,
		regularFont: PDFFont,
		boldFont: PDFFont,
		titleColor: ReturnType<typeof rgb>,
		ensureSpace: (height: number, shouldRedrawTableHeader?: boolean) => void,
	): number {
		let cursorY = pageContext.cursorY;

		ensureSpace(PDF_TITLE_SIZE + PDF_SECTION_GAP);
		cursorY = pageContext.cursorY;
		pageContext.page.drawText(document.title, {
			x: PDF_MARGIN,
			y: cursorY,
			font: boldFont,
			size: PDF_TITLE_SIZE,
			color: titleColor,
		});
		cursorY -= PDF_TITLE_SIZE + 6;
		pageContext.cursorY = cursorY;

		if (document.description) {
			const descriptionLines = this.wrapTextByWidth(
				regularFont,
				document.description,
				PDF_BODY_FONT_SIZE,
				PDF_CONTENT_WIDTH,
			);
			ensureSpace(
				descriptionLines.length * (PDF_BODY_FONT_SIZE + 2) + PDF_SECTION_GAP,
			);
			cursorY = pageContext.cursorY;
			cursorY = this.drawWrappedText(
				pageContext.page,
				descriptionLines,
				regularFont,
				PDF_BODY_FONT_SIZE,
				PDF_MARGIN,
				cursorY,
				PDF_CONTENT_WIDTH,
			);
			cursorY -= 4;
			pageContext.cursorY = cursorY;
		}

		document.summary.forEach((item) => {
			const summaryLines = this.wrapTextByWidth(
				regularFont,
				`${item.label}: ${item.value}`,
				PDF_SUMMARY_FONT_SIZE,
				PDF_CONTENT_WIDTH,
			);
			ensureSpace(summaryLines.length * (PDF_SUMMARY_FONT_SIZE + 2) + 2);
			cursorY = pageContext.cursorY;
			cursorY = this.drawWrappedText(
				pageContext.page,
				summaryLines,
				regularFont,
				PDF_SUMMARY_FONT_SIZE,
				PDF_MARGIN,
				cursorY,
				PDF_CONTENT_WIDTH,
			);
			pageContext.cursorY = cursorY;
		});

		return cursorY - PDF_SECTION_GAP;
	}

	private drawTableHeader<TRow>(
		page: PDFPage,
		columns: ReportColumn<TRow>[],
		boldFont: PDFFont,
		cursorY: number,
		primaryColor: ReturnType<typeof rgb>,
		secondaryColor: ReturnType<typeof rgb>,
	): number {
		const columnWidths = this.resolveColumnWidths(columns);

		page.drawRectangle({
			x: PDF_MARGIN,
			y: cursorY - PDF_TABLE_HEADER_HEIGHT,
			width: PDF_CONTENT_WIDTH,
			height: PDF_TABLE_HEADER_HEIGHT,
			color: primaryColor,
			opacity: 0.12,
			borderColor: secondaryColor,
			borderWidth: 0.5,
		});

		let currentX = PDF_MARGIN;

		columns.forEach((column, index) => {
			page.drawText(column.header, {
				x: currentX + PDF_TABLE_CELL_PADDING,
				y: cursorY - PDF_TABLE_HEADER_HEIGHT + 6,
				font: boldFont,
				size: PDF_TABLE_FONT_SIZE,
				color: primaryColor,
			});
			currentX += columnWidths[index];
		});

		return cursorY - PDF_TABLE_HEADER_HEIGHT - 6;
	}

	private drawTableRow<TRow>(
		page: PDFPage,
		columns: ReportColumn<TRow>[],
		renderedCells: string[][],
		regularFont: PDFFont,
		cursorY: number,
		rowHeight: number,
		lineColor: ReturnType<typeof rgb>,
	): void {
		const columnWidths = this.resolveColumnWidths(columns);
		let currentX = PDF_MARGIN;

		page.drawLine({
			start: { x: PDF_MARGIN, y: cursorY },
			end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: cursorY },
			thickness: 0.4,
			color: lineColor,
		});

		columns.forEach((column, index) => {
			const cellLines = renderedCells[index];
			const lineHeight = PDF_TABLE_LINE_HEIGHT;
			const cellYStart = cursorY - PDF_TABLE_CELL_PADDING - lineHeight;

			cellLines.forEach((line, lineIndex) => {
				const textY = cellYStart - lineIndex * lineHeight;
				const textWidth = regularFont.widthOfTextAtSize(
					line,
					PDF_TABLE_FONT_SIZE,
				);
				const baseX = currentX + PDF_TABLE_CELL_PADDING;
				const maxX = currentX + columnWidths[index] - PDF_TABLE_CELL_PADDING;

				page.drawText(line, {
					x: this.resolveAlignedCellX(
						baseX,
						maxX,
						textWidth,
						column.align ?? "left",
					),
					y: textY,
					font: regularFont,
					size: PDF_TABLE_FONT_SIZE,
				});
			});

			currentX += columnWidths[index];
		});

		page.drawLine({
			start: { x: PDF_MARGIN, y: cursorY - rowHeight },
			end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: cursorY - rowHeight },
			thickness: 0.4,
			color: lineColor,
		});
	}

	private renderRowCells<TRow>(
		row: TRow,
		columns: ReportColumn<TRow>[],
		regularFont: PDFFont,
	): string[][] {
		const columnWidths = this.resolveColumnWidths(columns);

		return columns.map((column, index) => {
			const value = resolveColumnValue(column, row);

			return this.wrapTextByWidth(
				regularFont,
				value,
				PDF_TABLE_FONT_SIZE,
				columnWidths[index] - PDF_TABLE_CELL_PADDING * 2,
			);
		});
	}

	private calculateRowHeight(renderedCells: string[][]): number {
		const maxLineCount = Math.max(
			...renderedCells.map((cell) => cell.length),
			1,
		);

		return (
			maxLineCount * PDF_TABLE_LINE_HEIGHT + PDF_TABLE_CELL_PADDING * 2 + 4
		);
	}

	private resolveColumnWidths<TRow>(columns: ReportColumn<TRow>[]): number[] {
		const columnUnits = columns.map((column) =>
			Math.max(column.width ?? column.header.length, column.header.length),
		);
		const totalUnits = columnUnits.reduce((sum, unit) => sum + unit, 0);

		return columnUnits.map((unit) => (PDF_CONTENT_WIDTH * unit) / totalUnits);
	}

	private drawWrappedText(
		page: PDFPage,
		lines: string[],
		font: PDFFont,
		fontSize: number,
		x: number,
		cursorY: number,
		_maxWidth: number,
	): number {
		let currentY = cursorY;

		lines.forEach((line) => {
			page.drawText(line, {
				x,
				y: currentY,
				font,
				size: fontSize,
			});
			currentY -= fontSize + 2;
		});

		return currentY;
	}

	private wrapTextByWidth(
		font: PDFFont,
		value: string,
		fontSize: number,
		maxWidth: number,
	): string[] {
		const normalizedValue = value.replace(/\s+/g, " ").trim();

		if (!normalizedValue) {
			return [""];
		}

		const words = normalizedValue.split(" ");
		const lines: string[] = [];
		let currentLine = "";

		words.forEach((word) => {
			const candidate = currentLine ? `${currentLine} ${word}` : word;

			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
				currentLine = candidate;
				return;
			}

			if (currentLine) {
				lines.push(currentLine);
			}

			if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
				currentLine = word;
				return;
			}

			const fragments = this.breakLongWord(font, word, fontSize, maxWidth);
			lines.push(...fragments.slice(0, -1));
			currentLine = fragments.at(-1) ?? "";
		});

		if (currentLine) {
			lines.push(currentLine);
		}

		return lines;
	}

	private breakLongWord(
		font: PDFFont,
		word: string,
		fontSize: number,
		maxWidth: number,
	): string[] {
		const fragments: string[] = [];
		let currentFragment = "";

		Array.from(word).forEach((character) => {
			const candidate = `${currentFragment}${character}`;

			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
				currentFragment = candidate;
				return;
			}

			if (currentFragment) {
				fragments.push(currentFragment);
			}

			currentFragment = character;
		});

		if (currentFragment) {
			fragments.push(currentFragment);
		}

		return fragments.length > 0 ? fragments : [word];
	}

	private resolveAlignedCellX(
		minX: number,
		maxX: number,
		textWidth: number,
		align: ReportColumnAlignment,
	): number {
		if (align === "right") {
			return Math.max(maxX - textWidth, minX);
		}

		if (align === "center") {
			return minX + Math.max((maxX - minX - textWidth) / 2, 0);
		}

		return minX;
	}

	private async embedLogo(
		pdfDocument: PDFDocument,
		branding: ResolvedReportBranding | undefined,
	): Promise<PDFImage | null> {
		if (!branding?.logo?.buffer?.length) {
			return null;
		}

		try {
			if (branding.logo.contentType === "image/png") {
				return pdfDocument.embedPng(branding.logo.buffer);
			}

			if (branding.logo.contentType === "image/jpeg") {
				return pdfDocument.embedJpg(branding.logo.buffer);
			}
		} catch {
			return null;
		}

		return null;
	}

	private scaleLogo(embeddedLogo: PDFImage): { width: number; height: number } {
		const widthRatio = PDF_LOGO_MAX_WIDTH / embeddedLogo.width;
		const heightRatio = PDF_LOGO_MAX_HEIGHT / embeddedLogo.height;
		const scale = Math.min(widthRatio, heightRatio, 1);

		return {
			width: embeddedLogo.width * scale,
			height: embeddedLogo.height * scale,
		};
	}

	private resolveColors(branding: ResolvedReportBranding | undefined): {
		primary: ReturnType<typeof rgb>;
		secondary: ReturnType<typeof rgb>;
	} {
		return {
			primary: this.parseColor(branding?.primaryColor, rgb(0.11, 0.2, 0.38)),
			secondary: this.parseColor(
				branding?.secondaryColor,
				rgb(0.35, 0.39, 0.47),
			),
		};
	}

	private parseColor(
		value: string | null | undefined,
		fallback: ReturnType<typeof rgb>,
	): ReturnType<typeof rgb> {
		if (!value) {
			return fallback;
		}

		const normalized = value.trim().replace("#", "");
		const expanded =
			normalized.length === 3
				? normalized
						.split("")
						.map((character) => `${character}${character}`)
						.join("")
				: normalized;

		if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
			return fallback;
		}

		const red = parseInt(expanded.slice(0, 2), 16) / 255;
		const green = parseInt(expanded.slice(2, 4), 16) / 255;
		const blue = parseInt(expanded.slice(4, 6), 16) / 255;

		return rgb(red, green, blue);
	}
}
