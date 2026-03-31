import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrganizationMemberAccessUseCase } from '@/modules/permissions/application/use-cases/get-organization-member-access.use-case';
import { UpdateOrganizationMemberAccessUseCase } from '@/modules/permissions/application/use-cases/update-organization-member-access.use-case';
import {
  OrganizationMemberUserIdParamDto,
  PermissionSnapshotResponseDto,
  UpdateOrganizationMemberAccessDto,
} from '@/modules/permissions/presentation/http/dtos';
import {
  ApiDoc,
  CurrentOrganization,
  RequireOrganizationPermissions,
} from '@/shared/http/decorators';
import { ResponseHelper } from '@/shared/http/helpers/response-helper';

@ApiTags('Permissions')
@Controller('organizations/current/members')
export class OrganizationMemberAccessController {
  constructor(
    private readonly getOrganizationMemberAccessUseCase: GetOrganizationMemberAccessUseCase,
    private readonly updateOrganizationMemberAccessUseCase: UpdateOrganizationMemberAccessUseCase,
  ) { }

  @Get(':userId/access')
  @RequireOrganizationPermissions('organization_members.manage')
  @ApiDoc({
    summary: 'Get organization member access',
    response: PermissionSnapshotResponseDto,
    commonResponses: ['unauthorized', 'conflict', 'forbidden', 'notFound'],
    params: [
      {
        name: 'userId',
        description: 'Organization member user ID',
        example: '1925012345678901248',
      },
    ],
  })
  async getAccess(
    @CurrentOrganization('id') organizationId: string,
    @Param() params: OrganizationMemberUserIdParamDto,
  ) {
    const result = await this.getOrganizationMemberAccessUseCase.execute(
      organizationId,
      params.userId,
    );

    return ResponseHelper.success(result.data, result.message);
  }

  @Put(':userId/access')
  @RequireOrganizationPermissions('organization_members.manage')
  @ApiDoc({
    summary: 'Replace organization member access',
    body: UpdateOrganizationMemberAccessDto,
    response: PermissionSnapshotResponseDto,
    commonResponses: ['badRequest', 'unauthorized', 'conflict', 'forbidden', 'notFound'],
    params: [
      {
        name: 'userId',
        description: 'Organization member user ID',
        example: '1925012345678901248',
      },
    ],
  })
  async updateAccess(
    @CurrentOrganization('id') organizationId: string,
    @Param() params: OrganizationMemberUserIdParamDto,
    @Body() dto: UpdateOrganizationMemberAccessDto,
  ) {
    const result = await this.updateOrganizationMemberAccessUseCase.execute(
      organizationId,
      params.userId,
      dto,
    );

    return ResponseHelper.success(result.data, result.message);
  }
}
