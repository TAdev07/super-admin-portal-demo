import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(Permission) private perms: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto) {
    const permissions = dto.permissionCodes?.length
      ? await this.perms.find({ where: { code: In(dto.permissionCodes) } })
      : [];
    const role = this.roles.create({
      name: dto.name,
      description: dto.description ?? null,
      permissions,
    });
    return this.roles.save(role);
  }

  findAll() {
    return this.roles.find({ relations: ['permissions'] });
  }

  async findOne(id: number) {
    const role = await this.roles.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (dto.permissionCodes) {
      role.permissions = await this.perms.find({
        where: { code: In(dto.permissionCodes) },
      });
    }
    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined)
      role.description = dto.description ?? null;
    return this.roles.save(role);
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    await this.roles.remove(role);
  }
}
