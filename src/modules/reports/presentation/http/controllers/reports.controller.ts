import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ExportUsersReportUseCase } from '@/modules/reports/application/use-cases/export-users-report.use-case';
import { ExportUsersReportDto } from '../dtos/export-users-report.dto';
import { Public } from '@/shared/http/decorators';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly exportUsersReportUseCase: ExportUsersReportUseCase,
  ) { }

  @Get('users')
  @Public()
  @ApiOperation({
    summary: 'Export users report',
    description: 'Exports the users listing as PDF or spreadsheet. Spreadsheet format currently returns CSV compatible with Excel and Google Sheets.',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['pdf', 'spreadsheet'],
    description: 'Export format',
    example: 'pdf',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter by email',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by name',
  })
  @ApiProduces('application/pdf', 'text/csv')
  @ApiOkResponse({
    description: 'Generated report file',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportUsers(
    @Query() dto: ExportUsersReportDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.exportUsersReportUseCase.execute(dto);

    reply
      .header('Content-Type', result.contentType)
      .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
      .header('Content-Length', String(result.buffer.length))
      .header('Cache-Control', 'no-store')
      .send(result.buffer);
  }
}
