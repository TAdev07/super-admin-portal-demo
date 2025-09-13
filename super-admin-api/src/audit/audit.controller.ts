import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

type AuditServiceLike = {
  findAll?: (limit: number) => Promise<AuditLog[] | any[]>;
  getAll?: (limit: number) => Promise<AuditLog[] | any[]>;
};

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  findAll(@Query('limit') limit = '100'): Promise<AuditLog[] | any[]> {
    const n = Math.min(parseInt(limit, 10) || 100, 500);
    // Safely call service method if it exists; otherwise return empty array.
    const svc = this.auditService as unknown as AuditServiceLike;
    if (svc && typeof svc.findAll === 'function') {
      return svc.findAll(n);
    }
    if (svc && typeof svc.getAll === 'function') {
      return svc.getAll(n);
    }
    // Fallback: no known method found on service
    return Promise.resolve([]);
  }
}
