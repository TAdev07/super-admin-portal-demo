import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AppsModule } from './apps/apps.module';
import { AuthModule } from './auth/auth.module';
import { AuditLog } from './audit/entities/audit-log.entity';
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';

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
    TypeOrmModule.forFeature([AuditLog]),
    UsersModule,
    AppsModule,
    AuthModule,
  ],
  controllers: [AppController, AuditController],
  providers: [AppService, AuditService],
})
export class AppModule {}
