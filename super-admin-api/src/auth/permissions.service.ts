import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private perms: Repository<Permission>,
  ) {}

  create(dto: CreatePermissionDto) {
    const p = this.perms.create({
      code: dto.code,
      description: dto.description ?? null,
    });
    return this.perms.save(p);
  }

  findAll() {
    return this.perms.find();
  }

  async findOne(id: number) {
    const p = await this.perms.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Permission not found');
    return p;
  }

  async update(id: number, dto: UpdatePermissionDto) {
    const p = await this.findOne(id);
    if (dto.code) p.code = dto.code;
    if (dto.description !== undefined) p.description = dto.description ?? null;
    return this.perms.save(p);
  }

  async remove(id: number) {
    const p = await this.findOne(id);
    await this.perms.remove(p);
  }
}
