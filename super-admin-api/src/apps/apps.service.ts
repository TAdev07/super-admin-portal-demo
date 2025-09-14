import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { App } from './entities/app.entity';
import { BundlesService } from '../bundles/bundles.service';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
    private bundlesService: BundlesService,
  ) {}

  create(createAppDto: CreateAppDto): Promise<App> {
    const app = this.appRepository.create(createAppDto);
    return this.appRepository.save(app);
  }

  findAll(): Promise<App[]> {
    return this.appRepository.find();
  }

  findOne(id: number): Promise<App | null> {
    return this.appRepository.findOne({
      where: { id },
    });
  }

  async update(id: number, updateAppDto: UpdateAppDto): Promise<App | null> {
    await this.appRepository.update(id, updateAppDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.appRepository.delete(id);
  }

  async createWithBundle(
    createAppDto: CreateAppDto,
    bundle?: Express.Multer.File,
  ): Promise<App> {
    const app = await this.create(createAppDto);

    if (bundle) {
      await this.bundlesService.processBundle(app.code, bundle.buffer);
      // Reload app to get updated remoteEntry
      const updatedApp = await this.findOne(app.id);
      return updatedApp!;
    }

    return app;
  }

  async updateWithBundle(
    id: number,
    updateAppDto: UpdateAppDto,
    bundle?: Express.Multer.File,
  ): Promise<App | null> {
    const app = await this.update(id, updateAppDto);

    if (bundle && app) {
      await this.bundlesService.processBundle(app.code, bundle.buffer);
      // Reload app to get updated remoteEntry
      return this.findOne(app.id);
    }

    return app;
  }
}
