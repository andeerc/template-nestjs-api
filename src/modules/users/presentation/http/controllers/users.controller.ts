import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '@/modules/users/application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '@/modules/users/application/use-cases/delete-user.use-case';
import { FindUserUseCase } from '@/modules/users/application/use-cases/find-user.use-case';
import { ListUsersUseCase } from '@/modules/users/application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '@/modules/users/application/use-cases/update-user.use-case';
import {
  ApiDoc,
  CurrentOrganization,
  RequireOrganizationPermissions,
} from '@/shared/http/decorators';
import { ResponseHelper } from '@/shared/http/helpers/response-helper';
import {
  CreateUserDto,
  FindAllUsersDto,
  toUserResponseDto,
  UpdateUserDto,
  UserIdParamDto,
  UserResponseDto,
} from '../dtos';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findUserUseCase: FindUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) { }

  @Post()
  @ApiDoc({
    summary: 'Create user',
    body: CreateUserDto,
    response: UserResponseDto,
    commonResponses: ['badRequest', 'unauthorized'],
  })
  async create(@Body() dto: CreateUserDto) {
    const result = await this.createUserUseCase.execute(dto);
    return ResponseHelper.success(toUserResponseDto(result.data), result.message);
  }

  @Get(':id')
  @RequireOrganizationPermissions('users.read')
  @ApiDoc({
    summary: 'Get user by ID',
    response: UserResponseDto,
    commonResponses: ['badRequest', 'unauthorized', 'conflict', 'forbidden'],
    params: [
      {
        name: 'id',
        description: 'User ID',
        example: '1925012345678901248',
      },
    ],
  })
  async findOne(
    @CurrentOrganization('id') organizationId: string,
    @Param() params: UserIdParamDto,
  ) {
    const result = await this.findUserUseCase.execute(
      params.id,
      organizationId,
    );

    return ResponseHelper.success(toUserResponseDto(result.data), result.message);
  }

  @Get()
  @RequireOrganizationPermissions('users.read')
  @ApiDoc({
    summary: 'List users',
    response: UserResponseDto,
    isPaginated: true,
    commonResponses: ['badRequest', 'unauthorized', 'conflict', 'forbidden'],
    query: [
      { name: 'id', description: 'Filter by user ID' },
      { name: 'email', description: 'Filter by email' },
      { name: 'name', description: 'Filter by name' },
      { name: 'pageCount', description: 'Page number', example: 1 },
      { name: 'recordsPerPage', description: 'Page size', example: 25 },
    ],
  })
  async findAll(
    @CurrentOrganization('id') organizationId: string,
    @Query() dto: FindAllUsersDto,
  ) {
    const result = await this.listUsersUseCase.execute({
      ...dto,
      organizationId,
    });

    return ResponseHelper.paginated(
      result.data.map(toUserResponseDto),
      result.pageCount,
      result.recordsPerPage,
      result.total,
      result.message,
    );
  }

  @Patch(':id')
  @ApiDoc({
    summary: 'Update user',
    response: UserResponseDto,
    commonResponses: ['badRequest', 'unauthorized'],
    params: [
      {
        name: 'id',
        description: 'User ID',
        example: '1925012345678901248',
      },
    ],
    body: UpdateUserDto,
  })
  async update(
    @Param() params: UserIdParamDto,
    @Body() dto: UpdateUserDto,
  ) {
    const result = await this.updateUserUseCase.execute(params.id, dto);
    return ResponseHelper.success(toUserResponseDto(result.data), result.message);
  }

  @Delete(':id')
  @ApiDoc({
    summary: 'Delete user',
    commonResponses: ['badRequest', 'unauthorized'],
    params: [
      {
        name: 'id',
        description: 'User ID',
        example: '1925012345678901248',
      },
    ],
  })
  async delete(@Param() params: UserIdParamDto) {
    const result = await this.deleteUserUseCase.execute(params.id);
    return ResponseHelper.success(null, result.message);
  }
}
