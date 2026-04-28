import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  configureApp(app);

  const port = Number(configService.get<string>('PORT') ?? 3000);
  await app.listen(port);

  logger.log(`Time-Off Microservice running at http://localhost:${port}/api`);
  logger.log(`Health check available at http://localhost:${port}/api/health`);
}

void bootstrap();
