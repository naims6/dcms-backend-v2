import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { env } from '../../config/env.config.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: {
        expiresIn: env.jwtExpiresIn as unknown as number,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
