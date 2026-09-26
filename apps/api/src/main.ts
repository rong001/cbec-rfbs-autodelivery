import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load root .env then local .env (local overrides)
loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const origin = process.env.WEB_ORIGIN || 'http://127.0.0.1:3201';
  app.enableCors({
    origin: [origin, 'http://127.0.0.1:3201', 'http://localhost:3201'],
    credentials: true,
  });
  const port = Number(process.env.API_PORT || process.env.PORT || 3200);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://127.0.0.1:${port}`);
}
bootstrap();
