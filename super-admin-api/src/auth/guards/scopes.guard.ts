import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const required: string[] | undefined = this.reflector.getAllAndOverride<
      string[]
    >(SCOPES_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) {
      return true; // no scopes required
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { scopes?: string[]; scp?: string[] } }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const normalize = (s: string) => s.replace(/\./g, ':');
    const reqNorm = required.map(normalize);
    const userScopes: string[] = (user.scopes || user.scp || []).map(normalize);
    const missing: string[] = reqNorm.filter(
      (s: string) => !userScopes.includes(s),
    );
    if (missing.length) {
      throw new ForbiddenException({
        message: `Missing required scope(s): ${missing.join(', ')}`,
        missingScopes: missing,
        required: reqNorm,
        have: userScopes,
      });
    }
    return true;
  }
}
