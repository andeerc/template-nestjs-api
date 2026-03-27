import { Injectable } from '@nestjs/common';
import { UsersReportDefinition } from '../definitions/users-report.definition';
import { ReportExportService } from '../services/report-export.service';
import type { GeneratedReportFile, ReportFormat } from '../types/report.types';

export interface ExportUsersReportFilters {
  id?: string;
  email?: string;
  name?: string;
}

export interface ExportUsersReportInput extends ExportUsersReportFilters {
  format: ReportFormat;
}

@Injectable()
export class ExportUsersReportUseCase {
  constructor(
    private readonly usersReportDefinition: UsersReportDefinition,
    private readonly reportExportService: ReportExportService,
  ) {}

  async execute(input: ExportUsersReportInput): Promise<GeneratedReportFile> {
    const report = await this.usersReportDefinition.build({
      id: input.id,
      email: input.email,
      name: input.name,
    });

    return this.reportExportService.export(report, input.format);
  }
}
