import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`BOQ API listening on http://localhost:${port}/api`);
}

bootstrap();
