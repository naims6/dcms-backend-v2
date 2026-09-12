import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { UserModule } from './modules/user/user.module.js';
import { StudentModule } from './modules/student/student.module.js';
import { TeacherModule } from './modules/teacher/teacher.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    MailModule,
    RbacModule,
    UserModule,
    StudentModule,
    TeacherModule,
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
