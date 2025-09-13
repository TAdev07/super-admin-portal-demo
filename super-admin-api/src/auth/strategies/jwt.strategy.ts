import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-this-in-production',
    });
  }

  // Passport will treat the returned object as req.user
  validate(payload: {
    sub: number;
    email: string;
    role?: string;
    scp?: string[];
  }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      scopes: payload.scp || [],
    };
  }
}
