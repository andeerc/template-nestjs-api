import { Module } from '@nestjs/common';
import { UsersPersistenceModule } from '@/modules/users/infrastructure/persistence/users-persistence.module';
import { ExportUsersReportUseCase } from './application/use-cases/export-users-report.use-case';
import { UsersReportDefinition } from './application/definitions/users-report.definition';
import { ReportExportService } from './application/services/report-export.service';
import { PdfReportExporter } from './infrastructure/exporters/pdf-report.exporter';
import { SpreadsheetReportExporter } from './infrastructure/exporters/spreadsheet-report.exporter';
import { ReportsController } from './presentation/http/controllers/reports.controller';

@Module({
  imports: [UsersPersistenceModule],
  controllers: [ReportsController],
  providers: [
    UsersReportDefinition,
    ReportExportService,
    ExportUsersReportUseCase,
    PdfReportExporter,
    SpreadsheetReportExporter,
  ],
})
export class ReportsModule {}
