import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.useGlobalFilters(new PrismaClientExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
