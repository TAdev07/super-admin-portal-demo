import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
  Headers,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppValidationService } from '../apps/app-validation.service';
import { AppLoginDto } from '../apps/dto/app-login.dto';
import { JwtService } from '@nestjs/jwt';
import type {
  Response,
  Request as ExpressRequest,
  CookieOptions,
} from 'express';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';

interface AppTokenPayload {
  sub: number; // user id
  email: string;
  app: string; // app name
  aud: string; // audience: app:<name>
  scp: string[];
}

interface AuthUser {
  id: number;
  email: string;
  role?: string;
  scopes?: string[];
}

function getRefreshCookie(req: ExpressRequest): string | undefined {
  const anyReq = req as unknown as { cookies?: Record<string, unknown> };
  const value = anyReq.cookies?.['refresh_token'];
  return typeof value === 'string' ? value : undefined;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private appValidator: AppValidationService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private cookieOpts(kind: 'interactive' | 'silent'): CookieOptions {
    const secure =
      this.config.get<boolean>('COOKIE_SECURE') ?? kind === 'silent';
    const configuredSameSite = this.config.get<string>('COOKIE_SAMESITE');
    let sameSite: 'lax' | 'strict' | 'none';
    if (
      configuredSameSite === 'lax' ||
      configuredSameSite === 'strict' ||
      configuredSameSite === 'none'
    ) {
      sameSite = configuredSameSite;
    } else {
      sameSite = kind === 'silent' ? 'none' : 'lax';
    }
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    const path = this.config.get<string>('COOKIE_PATH') ?? '/api/auth';
    const maxAge = Number(
      this.config.get<number>('COOKIE_MAX_AGE_MS') ?? 30 * 24 * 60 * 60 * 1000,
    );
    return {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path,
      maxAge,
    };
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    // Set HttpOnly refresh cookie
    res.cookie(
      'refresh_token',
      result.refresh_token,
      this.cookieOpts('interactive'),
    );
    return { access_token: result.access_token, user: result.user };
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    res.cookie(
      'refresh_token',
      result.refresh_token,
      this.cookieOpts('interactive'),
    );
    return { access_token: result.access_token, user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: { user?: AuthUser }) {
    return req.user ?? null;
  }

  // Issue an app-scoped access token with subset of user's scopes limited by app allowedScopes
  @UseGuards(JwtAuthGuard)
  @Post('app/login')
  async appLogin(
    @Body() dto: AppLoginDto,
    @Request() req: { user?: AuthUser },
  ) {
    const user = req.user;
    if (!user) return { error: 'No user context' };
    const { grantedScopes, app } = await this.appValidator.validateRequest({
      appName: dto.appName,
      origin: dto.origin,
      requestedScopes: dto.requestedScopes,
    });
    const userScopes: string[] = user.scopes || [];
    const finalScopes: string[] = grantedScopes.filter((s: string) =>
      userScopes.includes(s),
    );
    if (!finalScopes.length) {
      throw new ForbiddenException('User lacks requested scopes');
    }
    const payload: AppTokenPayload = {
      sub: user.id,
      email: user.email,
      app: app.name,
      aud: `app:${app.name}`,
      scp: finalScopes,
    };
    const token = this.jwt.sign(payload, { expiresIn: '15m' });
    return { access_token: token, scopes: finalScopes, app: app.name };
  }

  @Post('refresh')
  async refresh(
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = getRefreshCookie(req);
    if (!token) return { error: 'No refresh token' };
    const rotated = await this.authService.refresh(token);
    res.cookie(
      'refresh_token',
      rotated.refresh_token,
      this.cookieOpts('interactive'),
    );
    return { access_token: rotated.access_token };
  }

  @Post('logout')
  async logout(
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = getRefreshCookie(req);
    if (token) await this.authService.logout(token);
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return { success: true };
  }

  // Silent SSO: if refresh cookie exists, issue new access token without user interaction.
  // Supports optional ?trace=1 to include handshake debug info.
  @Get('silent')
  async silent(
    @Request() req: ExpressRequest & { correlationId?: string },
    @Res({ passthrough: true }) res: Response,
    @Headers('origin') origin: string | undefined,
    @Query('trace') trace?: string,
  ) {
    const start = Date.now();
    const token = getRefreshCookie(req);
    const correlationId = (req as ExpressRequest & { correlationId?: string })
      .correlationId;
    const debug: Record<string, unknown> = trace
      ? { correlationId, origin }
      : {};
    if (!token) {
      return { authenticated: false, reason: 'no_refresh_cookie', ...debug };
    }
    try {
      const rotated = await this.authService.refresh(token);
      // Re-set cookie (rotation already performed)
      res.cookie(
        'refresh_token',
        rotated.refresh_token,
        this.cookieOpts('silent'),
      );
      const duration = Date.now() - start;
      return {
        authenticated: true,
        access_token: rotated.access_token,
        durationMs: duration,
        ...debug,
      };
    } catch (e) {
      return {
        authenticated: false,
        reason: 'refresh_failed',
        error: (e as Error).message,
        ...debug,
      };
    }
  }
}
