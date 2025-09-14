import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Scopes } from './decorators/scopes.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Scopes('roles:write')
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('roles:read')
  @Get()
  findAll() {
    return this.roles.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('roles:read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roles.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('roles:write')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('roles:write')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roles.remove(id);
  }
}
