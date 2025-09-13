import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit/audit.service';
import { AuditInterceptor } from './audit/audit.interceptor';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { App } from './apps/entities/app.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000', // URL của frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Add global prefix
  app.setGlobalPrefix('api');

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Dynamic CSP origins from Apps table
  const appRepo = app.get<Repository<App>>(getRepositoryToken(App), {
    strict: false,
  });
  let appOrigins: string[] = [];
  try {
    const apps: App[] = await appRepo.find();
    appOrigins = apps
      .map((a) => a.origin)
      .filter((o: string | undefined): o is string => Boolean(o));
  } catch {
    // ignore if repo not ready during first bootstrap
  }

  const frameAndScript = ["'self'", ...appOrigins];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          // Only allow scripts we host or approved app origins (no inline/eval)
          'script-src': frameAndScript,
          'frame-src': frameAndScript,
          'connect-src': ["'self'", ...appOrigins],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          // Prevent other sites from iframing unless explicitly registered
          'frame-ancestors': ["'self'"],
          // Optionally uncomment if you want automatic upgrade
          // 'upgrade-insecure-requests': [],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookies
  app.use(cookieParser());

  // Correlation ID middleware
  const corr = new CorrelationIdMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) =>
    corr.use(req, res, next),
  );

  // Global audit interceptor
  const audit = app.get(AuditService);
  app.useGlobalInterceptors(new AuditInterceptor(audit));

  // Enhanced naive in-memory rate limiter (per IP + per appName header) if @nestjs/throttler unavailable
  const rateWindowMs = 15 * 60 * 1000;
  const perIpLimit = 300; // requests per window per IP
  const perAppLimit = 1000; // aggregate per window per app
  const ipHits = new Map<string, { count: number; reset: number }>();
  const appHits = new Map<string, { count: number; reset: number }>();
  app.use(
    (
      req: import('express').Request & { headers: Record<string, string> },
      res: import('express').Response,
      next: import('express').NextFunction,
    ) => {
      const ip: string =
        req.ip ||
        (req.connection as unknown as { remoteAddress?: string })
          ?.remoteAddress ||
        'unknown';
      const appName = (req.headers['x-app-name'] as string) || 'public';
      const now = Date.now();
      const manage = (
        map: Map<string, { count: number; reset: number }>,
        key: string,
        limit: number,
      ) => {
        let entry = map.get(key);
        if (!entry || entry.reset < now) {
          entry = { count: 0, reset: now + rateWindowMs };
          map.set(key, entry);
        }
        entry.count += 1;
        return { entry, remaining: Math.max(limit - entry.count, 0) };
      };
      const { entry: ipEntry, remaining: ipRemaining } = manage(
        ipHits,
        ip,
        perIpLimit,
      );
      const { entry: appEntry, remaining: appRemaining } = manage(
        appHits,
        appName,
        perAppLimit,
      );
      res.setHeader('X-RateLimit-Limit', perIpLimit.toString());
      res.setHeader('X-RateLimit-Remaining', ipRemaining.toString());
      res.setHeader(
        'X-RateLimit-Reset',
        Math.round(ipEntry.reset / 1000).toString(),
      );
      res.setHeader('X-AppRateLimit-Limit', perAppLimit.toString());
      res.setHeader('X-AppRateLimit-Remaining', appRemaining.toString());
      res.setHeader(
        'X-AppRateLimit-Reset',
        Math.round(appEntry.reset / 1000).toString(),
      );
      if (ipEntry.count > perIpLimit) {
        res.status(429).json({ error: 'Too Many Requests (IP)', scope: 'ip' });
        return;
      }
      if (appEntry.count > perAppLimit) {
        res
          .status(429)
          .json({ error: 'Too Many Requests (App)', scope: 'app', appName });
        return;
      }
      next();
    },
  );

  // Listen on port 3001
  await app.listen(3001);
}
bootstrap().catch((error) => console.error(error));
