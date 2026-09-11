import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  AuthResponseDto,
  MessageResponseDto,
  TokenRefreshResponseDto,
} from './dto/auth-response.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * User creation / Registration (Protected: require admin / active user session).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('User registered successfully')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  /**
   * Login with email and password.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('User logged in successfully')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  /**
   * Refresh JWT token pair.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens refreshed successfully')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() refreshTokenDto?: Partial<RefreshTokenDto>,
  ): Promise<TokenRefreshResponseDto> {
    const refreshToken =
      refreshTokenDto?.refreshToken || this.getCookie(req, 'refresh_token');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refreshToken({ refreshToken });
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  /**
   * Change user password (Protected).
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password changed successfully')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  /**
   * Logout user and invalidate refresh token session (Protected).
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('User logged out successfully')
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { refreshToken?: string },
  ): Promise<MessageResponseDto> {
    const refreshToken =
      body?.refreshToken || this.getCookie(req, 'refresh_token');
    const result = await this.authService.logout(userId, refreshToken);
    this.clearTokenCookies(res);
    return result;
  }

  // ---------------------------- Helper Methods ----------------------------
  // get cookie value by name
  private getCookie(req: Request, name: string): string | undefined {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const val = cookies?.[name];
    return typeof val === 'string' ? val : undefined;
  }

  // set cookies for access and refresh tokens
  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken?: string,
  ): void {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
  }

  // clear cookies
  private clearTokenCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
