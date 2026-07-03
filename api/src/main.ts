import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.use(json({ limit: '15mb' })); // ảnh base64 từ màn hình thợ/QC

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Ảnh/file upload (dev) phục vụ tĩnh.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // OpenAPI/Swagger (hợp đồng API).
  const config = new DocumentBuilder()
    .setTitle('ENSHIDO API — MVP Core')
    .setDescription('Đơn hàng → Sản xuất → Trọng lượng → QC')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`✅ ENSHIDO API chạy tại http://localhost:${port}/api (docs: /api/docs)`);
}

bootstrap();
