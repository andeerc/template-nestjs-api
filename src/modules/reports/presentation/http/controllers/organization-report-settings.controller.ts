import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import {
  REPORT_SETTINGS_ALLOWED_LOGO_CONTENT_TYPES,
  REPORT_SETTINGS_LOGO_MAX_SIZE_BYTES,
} from '@/modules/reports/application/constants/report-settings.constants';
import { DeleteCurrentOrganizationReportLogoUseCase } from '@/modules/reports/application/use-cases/delete-current-organization-report-logo.use-case';
import { GetCurrentOrganizationReportSettingsUseCase } from '@/modules/reports/application/use-cases/get-current-organization-report-settings.use-case';
import { UpdateCurrentOrganizationReportSettingsUseCase } from '@/modules/reports/application/use-cases/update-current-organization-report-settings.use-case';
import { UploadCurrentOrganizationReportLogoUseCase } from '@/modules/reports/application/use-cases/upload-current-organization-report-logo.use-case';
import {
  OrganizationReportSettingsResponseDto,
  UpdateOrganizationReportSettingsDto,
  toOrganizationReportSettingsResponseDto,
} from '../dtos';
import {
  ApiDoc,
  CurrentOrganization,
  CurrentUser,
  RequireOrganizationPermissions,
} from '@/shared/http/decorators';
import { ResponseHelper } from '@/shared/http/helpers/response-helper';

type MultipartFastifyRequest = FastifyRequest & {
  file(): Promise<MultipartFile | undefined>;
};

@ApiTags('Reports')
@Controller('organizations/current/report-settings')
export class OrganizationReportSettingsController {
  constructor(
    private readonly getCurrentOrganizationReportSettingsUseCase: GetCurrentOrganizationReportSettingsUseCase,
    private readonly updateCurrentOrganizationReportSettingsUseCase: UpdateCurrentOrganizationReportSettingsUseCase,
    private readonly uploadCurrentOrganizationReportLogoUseCase: UploadCurrentOrganizationReportLogoUseCase,
    private readonly deleteCurrentOrganizationReportLogoUseCase: DeleteCurrentOrganizationReportLogoUseCase,
  ) { }

  @Get()
  @RequireOrganizationPermissions('report_settings.read')
  @ApiDoc({
    summary: 'Get report settings for the current organization',
    response: OrganizationReportSettingsResponseDto,
    commonResponses: ['unauthorized', 'conflict', 'forbidden'],
  })
  async getCurrent(
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('name') organizationName: string | undefined,
  ) {
    const result =
      await this.getCurrentOrganizationReportSettingsUseCase.execute(
        organizationId,
      );

    return ResponseHelper.success(
      toOrganizationReportSettingsResponseDto(
        organizationId,
        organizationName,
        result.data,
      ),
      result.message,
    );
  }

  @Patch()
  @RequireOrganizationPermissions('report_settings.update')
  @ApiDoc({
    summary: 'Update report settings for the current organization',
    body: UpdateOrganizationReportSettingsDto,
    response: OrganizationReportSettingsResponseDto,
    commonResponses: ['badRequest', 'unauthorized', 'conflict', 'forbidden'],
  })
  async update(
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('name') organizationName: string | undefined,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationReportSettingsDto,
  ) {
    const result =
      await this.updateCurrentOrganizationReportSettingsUseCase.execute(
        organizationId,
        userId,
        dto,
      );

    return ResponseHelper.success(
      toOrganizationReportSettingsResponseDto(
        organizationId,
        organizationName,
        result.data,
      ),
      result.message,
    );
  }

  @Put('logo')
  @RequireOrganizationPermissions('report_settings.update')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['logo'],
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiDoc({
    summary: 'Upload report logo for the current organization',
    response: OrganizationReportSettingsResponseDto,
    commonResponses: ['badRequest', 'unauthorized', 'conflict', 'forbidden'],
  })
  async uploadLogo(
    @Req() request: MultipartFastifyRequest,
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('name') organizationName: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    const logo = await request.file();

    if (!logo) {
      throw new BadRequestException('Logo file is required');
    }

    if (logo.fieldname !== 'logo') {
      throw new BadRequestException('Logo file must be sent in the "logo" field');
    }

    if (
      !REPORT_SETTINGS_ALLOWED_LOGO_CONTENT_TYPES.includes(
        logo.mimetype as (typeof REPORT_SETTINGS_ALLOWED_LOGO_CONTENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Logo must be a PNG or JPEG image');
    }

    const buffer = await logo.toBuffer();

    if (buffer.length === 0) {
      throw new BadRequestException('Logo file cannot be empty');
    }

    if (buffer.length > REPORT_SETTINGS_LOGO_MAX_SIZE_BYTES) {
      throw new BadRequestException('Logo file exceeds the 1 MB size limit');
    }

    const result =
      await this.uploadCurrentOrganizationReportLogoUseCase.execute(
        organizationId,
        userId,
        {
          fileName: logo.filename,
          contentType: logo.mimetype,
          sizeBytes: buffer.length,
          blob: buffer,
        },
      );

    return ResponseHelper.success(
      toOrganizationReportSettingsResponseDto(
        organizationId,
        organizationName,
        result.data,
      ),
      result.message,
    );
  }

  @Delete('logo')
  @RequireOrganizationPermissions('report_settings.update')
  @ApiDoc({
    summary: 'Delete report logo for the current organization',
    response: OrganizationReportSettingsResponseDto,
    commonResponses: ['unauthorized', 'conflict', 'forbidden'],
  })
  async deleteLogo(
    @CurrentOrganization('id') organizationId: string,
    @CurrentOrganization('name') organizationName: string | undefined,
    @CurrentUser('id') userId: string,
  ) {
    const result =
      await this.deleteCurrentOrganizationReportLogoUseCase.execute(
        organizationId,
        userId,
      );

    return ResponseHelper.success(
      toOrganizationReportSettingsResponseDto(
        organizationId,
        organizationName,
        result.data,
      ),
      result.message,
    );
  }
}
