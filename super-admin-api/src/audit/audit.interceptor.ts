import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuditService } from './audit.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { id?: number }; correlationId?: string }
      >();
    const actorId: number | null =
      typeof req.user?.id === 'number' ? (req.user?.id ?? null) : null;
    const cid: string | undefined =
      req.correlationId || (req.headers['x-request-id'] as string | undefined);
    const path = (req as unknown as { route?: { path?: string } }).route?.path;
    const action = `${req.method} ${path ?? req.url}`;
    const targetType = path;
    const targetId = (req.params as unknown as { id?: string })?.id;

    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        void this.audit.write({
          actorId: actorId ?? null,
          action,
          targetType: targetType ?? null,
          targetId: targetId ?? null,
          payload: JSON.stringify({
            ok: true,
            durationMs: Date.now() - started,
          }),
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string,
          cid: cid ?? null,
        });
      }),
      catchError((err: unknown) => {
        const httpLike = err as {
          status?: number;
          getStatus?: () => number;
          message?: unknown;
          response?: unknown;
        };
        const status = httpLike.getStatus?.();
        const messageStr =
          typeof httpLike.message === 'string' ? httpLike.message : 'Error';
        const body: Record<string, unknown> = {
          ok: false,
          error: messageStr,
          durationMs: Date.now() - started,
          path: req.originalUrl,
        };
        if (status) body.status = status;
        // capture missing scopes detail
        const responseObj = (err as { response?: unknown }).response as
          | { missingScopes?: string[]; required?: string[] }
          | undefined;
        if (responseObj?.missingScopes) {
          body.missingScopes = responseObj.missingScopes;
          body.required = responseObj.required;
          body.reason = 'missing_scopes';
        }
        if (
          typeof httpLike.message === 'string' &&
          /Origin mismatch/i.test(httpLike.message)
        ) {
          body.originMismatch = true;
          body.reason = body.reason || 'origin_mismatch';
        }
        const appHeader = req.headers['x-app-name'];
        if (appHeader) body.appName = appHeader;
        void this.audit.write({
          actorId: actorId ?? null,
          action,
          targetType: targetType ?? null,
          targetId: targetId ?? null,
          payload: JSON.stringify(body),
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string,
          cid: cid ?? null,
        });
        return throwError(() => err as Error);
      }),
    );
  }
}
