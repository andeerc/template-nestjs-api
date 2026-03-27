import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '@/modules/auth/application/use-cases/login.use-case';
import { RequestPasswordResetUseCase } from '@/modules/auth/application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/reset-password.use-case';
import { ValidatePasswordResetTokenUseCase } from '@/modules/auth/application/use-cases/validate-password-reset-token.use-case';
import { toUserResponseDto, UserResponse } from '@/modules/users/presentation/http/dtos';
import { ApiDoc, Public } from '@/shared/http/decorators';
import { ResponseHelper } from '@/shared/http/helpers/response-helper';
import {
  AuthResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ValidatePasswordResetTokenDto,
  ValidatePasswordResetTokenResponseDto,
} from '../dtos';
import type { FastifyRequest } from 'fastify';
import { SessionContextService } from '@/shared/context/session-context.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionContextService: SessionContextService,
    private readonly loginUseCase: LoginUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly validatePasswordResetTokenUseCase: ValidatePasswordResetTokenUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
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
    this.setAuthenticatedSession(request, user);

    return {
      user: toUserResponseDto(result.user),
      token: result.token,
      message: 'Login successful',
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Request password reset',
    description: 'Requests a password reset link and always returns a generic success response.',
    response: ForgotPasswordResponseDto,
    commonResponses: ['badRequest'],
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.requestPasswordResetUseCase.execute({
      email: dto.email,
    });

    return ResponseHelper.success({ submitted: true }, result.message);
  }

  @Public()
  @Get('reset-password/validate')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Validate password reset token',
    description: 'Validates whether the password reset token received by email is still valid.',
    response: ValidatePasswordResetTokenResponseDto,
    commonResponses: ['badRequest'],
    query: [
      {
        name: 'token',
        description: 'Password reset token',
      },
    ],
  })
  async validateResetPasswordToken(@Query() dto: ValidatePasswordResetTokenDto) {
    const result = await this.validatePasswordResetTokenUseCase.execute({
      token: dto.token,
    });

    return ResponseHelper.success(
      {
        valid: result.valid,
        expiresAt: result.expiresAt.toISOString(),
      },
      result.message,
    );
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Reset password',
    description: 'Resets the user password using a valid reset token.',
    response: ResetPasswordResponseDto,
    commonResponses: ['badRequest'],
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.resetPasswordUseCase.execute({
      token: dto.token,
      password: dto.password,
    });

    return ResponseHelper.success({ completed: true }, result.message);
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
