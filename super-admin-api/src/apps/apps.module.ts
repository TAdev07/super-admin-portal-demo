import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { App } from './entities/app.entity';
import { BundlesModule } from '../bundles/bundles.module';

@Module({
  imports: [TypeOrmModule.forFeature([App]), BundlesModule],
  controllers: [AppsController],
  providers: [AppsService],
})
export class AppsModule {}
