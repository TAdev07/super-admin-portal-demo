import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { AppValidationService } from '../apps/app-validation.service';
import { App } from '../apps/entities/app.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { ScopesGuard } from './guards/scopes.guard';
import { APP_GUARD } from '@nestjs/core';
import { PermissionMappingService } from './permission-mapping.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([Role, Permission, App, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'your-super-secret-jwt-key-change-this-in-production',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RolesService,
    PermissionsService,
    AppValidationService,
    PermissionMappingService,
    // Register ScopesGuard globally (after passport has validated JWT)
    { provide: APP_GUARD, useClass: ScopesGuard },
  ],
  controllers: [AuthController, RolesController, PermissionsController],
  exports: [AuthService],
})
export class AuthModule {}
