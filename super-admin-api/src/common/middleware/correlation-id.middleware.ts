import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare module 'http' {
  interface IncomingMessage {
    correlationId?: string;
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const headerCid = (req.headers['x-request-id'] as string) || undefined;
    const cid = headerCid || randomUUID();
    (req as Request & { correlationId?: string }).correlationId = cid;
    next();
  }
}
