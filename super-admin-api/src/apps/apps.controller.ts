import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('apps')
@UseGuards(JwtAuthGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post()
  create(@Body() createAppDto: CreateAppDto) {
    return this.appsService.create(createAppDto);
  }

  @Get()
  findAll() {
    return this.appsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppDto: UpdateAppDto,
  ) {
    return this.appsService.update(id, updateAppDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appsService.remove(id);
  }

  @Post('with-bundle')
  @UseInterceptors(FileInterceptor('bundle'))
  createWithBundle(
    @Body() createAppDto: CreateAppDto,
    @UploadedFile() bundle?: Express.Multer.File,
  ) {
    return this.appsService.createWithBundle(createAppDto, bundle);
  }

  @Patch(':id/with-bundle')
  @UseInterceptors(FileInterceptor('bundle'))
  updateWithBundle(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppDto: UpdateAppDto,
    @UploadedFile() bundle?: Express.Multer.File,
  ) {
    return this.appsService.updateWithBundle(id, updateAppDto, bundle);
  }
}
