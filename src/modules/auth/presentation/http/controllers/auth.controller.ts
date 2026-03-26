import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '@/modules/auth/application/use-cases/login.use-case';
import { ApiDoc, Public } from '@/shared/http/decorators';
import { AuthResponseDto, LoginDto } from '../dtos';

/**
 * Authentication Controller
 *
 * Handles authentication endpoints inside the auth feature slice.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) { }

  /**
   * Login endpoint
   *
   * Authenticates a user with email and password.
   * Uses Zod for automatic request validation.
   *
   * @param loginDto - Login credentials (email, password)
   * @returns User data and authentication token
   *
   * @example
   * POST /auth/login
   * {
   *   "email": "user@example.com",
   *   "password": "myPassword123"
   * }
   */
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
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.loginUseCase.execute({
      email: loginDto.email,
      password: loginDto.password,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      },
      token: result.token,
      message: 'Login successful',
    };
  }
}
