import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { CustomThrottlerGuard } from './common/guards/throttler.guard.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { UserModule } from './modules/user/user.module.js';
import { StudentModule } from './modules/student/student.module.js';
import { TeacherModule } from './modules/teacher/teacher.module.js';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { AdmissionModule } from './modules/admission/admission.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { env } from './config/env.config.js';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        // Global: 100 requests per 60 seconds per IP (applies to all routes)
        // Override per-route with @AuthThrottle() or @UploadThrottle()
        { name: 'global', ttl: 60_000, limit: 100 },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis({
          host: env.redis.host,
          port: env.redis.port,
          password: env.redis.password ?? undefined,
          // Dedicated connection for rate-limit counters
          lazyConnect: true,
        }),
      ),
    }),
    PrismaModule,
    RedisModule,
    CloudinaryModule,
    AuthModule,
    MailModule,
    RbacModule,
    UserModule,
    StudentModule,
    TeacherModule,
    PaymentModule,
    AdmissionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // CustomThrottlerGuard MUST be first — block excess traffic before any auth logic
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // JwtAuthGuard MUST be registered before PermissionsGuard so that
    // request.user is populated before the permissions check runs.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
