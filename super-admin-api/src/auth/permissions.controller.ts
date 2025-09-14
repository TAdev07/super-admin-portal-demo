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
import { PermissionsService } from './permissions.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Scopes } from './decorators/scopes.decorator';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly perms: PermissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Scopes('permissions:write')
  @Post()
  create(@Body() dto: CreatePermissionDto) {
    return this.perms.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('permissions:read')
  @Get()
  findAll() {
    return this.perms.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('permissions:read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.perms.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('permissions:write')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.perms.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Scopes('permissions:write')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.perms.remove(id);
  }
}
