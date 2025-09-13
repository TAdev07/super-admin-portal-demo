import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from './entities/app.entity';

@Injectable()
export class AppValidationService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {}

  async validateRequest(params: {
    appName: string;
    origin: string;
    requestedScopes: string[];
  }): Promise<{ app: App; grantedScopes: string[] }> {
    const { appName, origin, requestedScopes } = params;
    const app = await this.appRepo.findOne({ where: { name: appName } });
    if (!app) throw new BadRequestException('Unknown app');
    if (app.origin && app.origin !== origin) {
      throw new ForbiddenException('Origin mismatch');
    }
    const allowed = new Set(
      (app.allowedScopes || []).map((s) => s.trim()).filter(Boolean),
    );
    const granted: string[] = [];
    for (const s of requestedScopes) {
      if (allowed.has(s)) granted.push(s);
    }
    if (!granted.length) {
      throw new ForbiddenException('No requested scopes permitted');
    }
    return { app, grantedScopes: granted.sort() };
  }
}
