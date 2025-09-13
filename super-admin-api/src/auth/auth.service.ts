import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { scopesForLegacyRole } from './role-scope-mapping';
import { PermissionMappingService } from './permission-mapping.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import * as crypto from 'crypto';

interface JwtPayload {
  email: string;
  sub: number;
  role?: string; // legacy
  scp: string[]; // scopes array
  appId?: number; // optional application context
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    @Optional() private readonly permMapper?: PermissionMappingService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email, true); // load roles + permissions
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  private deriveScopes(user: User): string[] {
    if (this.permMapper) return this.permMapper.deriveScopes(user);
    // legacy fallback only
    return scopesForLegacyRole(user.role || '').sort();
  }

  private generateRefreshTokenString(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  private hashRefreshToken(token: string): string {
    const pepper = process.env.REFRESH_TOKEN_PEPPER || '';
    return crypto
      .createHash('sha256')
      .update(token + pepper)
      .digest('hex');
  }

  private async persistRefreshToken(userId: number): Promise<RefreshToken> {
    const plain = this.generateRefreshTokenString();
    const hashed = this.hashRefreshToken(plain);
    const ttlDays = 30; // configurable later
    const entity = this.refreshRepo.create({
      token: hashed,
      userId,
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
    });
    const saved = await this.refreshRepo.save(entity);
    // Overwrite in-memory token value with plaintext for returning to caller
    saved.token = plain;
    return saved;
  }

  private async revokeToken(token: RefreshToken, replacedByToken?: string) {
    token.revoked = true;
    if (replacedByToken) token.replacedByToken = replacedByToken;
    await this.refreshRepo.save(token);
  }

  private async getValidRefreshTokenOrThrow(
    tokenStr: string,
  ): Promise<RefreshToken> {
    const hashed = this.hashRefreshToken(tokenStr);
    const token = await this.refreshRepo.findOne({
      where: { token: hashed },
    });
    if (!token || token.revoked) {
      throw new ForbiddenException('Invalid refresh token');
    }
    if (token.expiresAt.getTime() < Date.now()) {
      await this.revokeToken(token);
      throw new ForbiddenException('Expired refresh token');
    }
    return token;
  }

  async login(loginDto: LoginDto, opts?: { appId?: number }) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const scopes = this.deriveScopes(user);
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      scp: scopes,
      ...(opts?.appId ? { appId: opts.appId } : {}),
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh = await this.persistRefreshToken(user.id);

    return {
      access_token,
      refresh_token: refresh.token, // will be moved to HttpOnly cookie at controller level
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        scopes,
      },
    };
  }

  async register(registerDto: RegisterDto, opts?: { appId?: number }) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const user = await this.usersService.create(registerDto);
    const clone: Partial<User> = { ...user };
    delete clone.password;
    const result = clone as Omit<User, 'password'>;

    const scopes = this.deriveScopes(user);
    const payload: JwtPayload = {
      email: result.email,
      sub: result.id,
      role: result.role,
      scp: scopes,
      ...(opts?.appId ? { appId: opts.appId } : {}),
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh = await this.persistRefreshToken(user.id);
    return {
      access_token,
      refresh_token: refresh.token,
      user: { ...result, scopes },
    };
  }

  async refresh(oldToken: string) {
    const existing = await this.getValidRefreshTokenOrThrow(oldToken);
    // rotate
    await this.revokeToken(existing);
    const newToken = await this.persistRefreshToken(existing.userId);
    const user = await this.usersService.findOne(existing.userId);
    if (!user) throw new ForbiddenException('User no longer exists');
    const scopes = this.deriveScopes(user);
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      scp: scopes,
    };
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    // link replacement
    existing.replacedByToken = this.hashRefreshToken(newToken.token);
    await this.refreshRepo.save(existing);
    return { access_token, refresh_token: newToken.token };
  }

  async logout(tokenStr: string) {
    try {
      const token = await this.getValidRefreshTokenOrThrow(tokenStr);
      await this.revokeToken(token);
    } catch {
      // ignore invalid - idempotent
    }
    return { success: true };
  }
}
