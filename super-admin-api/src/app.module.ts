import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppsModule } from './apps/apps.module';
// import { AuditModule } from './audit/audit.module';
import { BundlesModule } from './bundles/bundles.module';
import { App } from './apps/entities/app.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './database.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Set to false in production
      logging: true,
    }),
    AuthModule,
    UsersModule,
    AppsModule,
    // AuditModule,
    BundlesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
