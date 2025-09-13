import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private repo: Repository<AuditLog>,
  ) {}

  async write(entry: Partial<AuditLog>) {
    const log = this.repo.create(entry);
    return this.repo.save(log);
  }

  async findAll(limit = 100) {
    return this.repo.find({ order: { id: 'DESC' }, take: limit });
  }
}
