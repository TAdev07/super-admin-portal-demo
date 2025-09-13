import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { App } from './entities/app.entity';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
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
}
