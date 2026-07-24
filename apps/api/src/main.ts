import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`BOQ API listening on http://localhost:${port}/api`);
}

bootstrap();
