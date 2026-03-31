import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CreateOrganizationUseCase } from '@/modules/organizations/application/use-cases/create-organization.use-case';
import { GetCurrentOrganizationUseCase } from '@/modules/organizations/application/use-cases/get-current-organization.use-case';
import { ListOrganizationsUseCase } from '@/modules/organizations/application/use-cases/list-organizations.use-case';
import { SwitchCurrentOrganizationUseCase } from '@/modules/organizations/application/use-cases/switch-current-organization.use-case';
import type { OrganizationAccess } from '@/modules/organizations/domain/repositories/organization.repository.interface';
import {
  CreateOrganizationDto,
  type OrganizationResponse,
  OrganizationListResponseDto,
  OrganizationResponseDto,
  SelectCurrentOrganizationDto,
  toOrganizationResponseDto,
} from '@/modules/organizations/presentation/http/dtos';
import { ApiDoc, CurrentUser } from '@/shared/http/decorators';
import { ResponseHelper, type ApiResponseDto } from '@/shared/http/helpers/response-helper';
import { SessionStorageService } from '@/shared/session-storage/session-storage.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly sessionStorageService: SessionStorageService,
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly getCurrentOrganizationUseCase: GetCurrentOrganizationUseCase,
    private readonly switchCurrentOrganizationUseCase: SwitchCurrentOrganizationUseCase,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Create organization',
    body: CreateOrganizationDto,
    response: OrganizationResponseDto,
    commonResponses: ['badRequest', 'unauthorized'],
  })
  async create(
    @Req() request: FastifyRequest,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    const result = await this.createOrganizationUseCase.execute(userId, dto);

    this.setCurrentOrganizationSession(request, result.data);
    await request.session.save();

    return ResponseHelper.success(
      toOrganizationResponseDto(
        result.data,
        request.session.currentOrganizationId,
      ),
      result.message,
    );
  }

  @Get()
  @ApiDoc({
    summary: 'List organizations for current user',
    response: OrganizationListResponseDto,
    commonResponses: ['unauthorized'],
  })
  async findAll(
    @Req() request: FastifyRequest,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseDto<OrganizationResponse[]>> {
    const result = await this.listOrganizationsUseCase.execute(userId);
    const currentOrganizationId = request.session.currentOrganizationId;
    const data = result.data.map((organization) =>
      toOrganizationResponseDto(organization, currentOrganizationId),
    );

    return ResponseHelper.success(data, result.message);
  }

  @Get('current')
  @ApiDoc({
    summary: 'Get current organization from session',
    response: OrganizationResponseDto,
    commonResponses: ['unauthorized'],
  })
  async getCurrent(
    @Req() request: FastifyRequest,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.getCurrentOrganizationUseCase.execute(
      userId,
      request.session.currentOrganizationId,
    );

    if (!result.data) {
      this.clearCurrentOrganizationSession(request);
      await request.session.save();
      return ResponseHelper.success(null, result.message);
    }

    return ResponseHelper.success(
      toOrganizationResponseDto(
        result.data,
        request.session.currentOrganizationId,
      ),
      result.message,
    );
  }

  @Post('current')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Set current organization on session',
    body: SelectCurrentOrganizationDto,
    response: OrganizationResponseDto,
    commonResponses: ['badRequest', 'unauthorized', 'notFound'],
  })
  async setCurrent(
    @Req() request: FastifyRequest,
    @CurrentUser('id') userId: string,
    @Body() dto: SelectCurrentOrganizationDto,
  ) {
    const result = await this.switchCurrentOrganizationUseCase.execute(
      userId,
      dto.organizationId,
    );

    this.setCurrentOrganizationSession(request, result.data);
    await request.session.save();

    return ResponseHelper.success(
      toOrganizationResponseDto(
        result.data,
        request.session.currentOrganizationId,
      ),
      result.message,
    );
  }

  private setCurrentOrganizationSession(
    request: FastifyRequest,
    access: OrganizationAccess,
  ): void {
    request.session.currentOrganizationId = access.organization.id;
    request.session.currentOrganizationName = access.organization.name;
    request.session.currentOrganizationRole = access.role;

    this.sessionStorageService.updateStorageData({
      currentOrganizationId: access.organization.id,
      currentOrganizationName: access.organization.name,
      currentOrganizationRole: access.role,
    });
  }

  private clearCurrentOrganizationSession(request: FastifyRequest): void {
    request.session.currentOrganizationId = undefined;
    request.session.currentOrganizationName = undefined;
    request.session.currentOrganizationRole = undefined;

    this.sessionStorageService.updateStorageData({
      currentOrganizationId: undefined,
      currentOrganizationName: undefined,
      currentOrganizationRole: undefined,
    });
  }
}
