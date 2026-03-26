import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '@/modules/auth/application/use-cases/login.use-case';
import { toUserResponseDto, UserResponse } from '@/modules/users/presentation/http/dtos';
import { ApiDoc, Public } from '@/shared/http/decorators';
import { AuthResponseDto, LoginDto } from '../dtos';
import type { FastifyRequest } from 'fastify';
import { SessionContextService } from '@/shared/context/session-context.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionContextService: SessionContextService,
    private readonly loginUseCase: LoginUseCase,
  ) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'User login',
    description: 'Authenticate user with email and password. Returns user data without sensitive information.',
    response: AuthResponseDto,
    commonResponses: [
      'badRequest',
      {
        type: 'unauthorized',
        description: 'Invalid credentials',
      },
    ],
  })
  async login(
    @Req() request: FastifyRequest,
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    const result = await this.loginUseCase.execute({
      email: loginDto.email,
      password: loginDto.password,
    });

    const user = toUserResponseDto(result.user);
    this.setAuthenticatedSession(request, user)

    return {
      user: toUserResponseDto(result.user),
      token: result.token,
      message: 'Login successful',
    };
  }

  private setAuthenticatedSession(request: FastifyRequest, user: UserResponse) {
    request.session.userId = user.id;
    request.session.email = user.email;
    request.session.authenticated = true;

    this.sessionContextService.updateStorageData({
      userId: user.id,
      email: user.email,
      authenticated: true,
    });
  }
}
