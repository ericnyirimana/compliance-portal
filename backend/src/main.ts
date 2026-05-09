import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('BNR Licensing Portal API')
    .setDescription('National Bank of Rwanda — Licensing & Compliance Portal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Export OpenAPI spec on startup in development
  if (process.env.NODE_ENV !== 'production') {
    const yamlStr = yaml.dump(document);
    const outPath = path.join(__dirname, '..', 'openapi.yaml');
    fs.writeFileSync(outPath, yamlStr, 'utf8');
  }

  await app.listen(process.env.PORT || 3000);
  console.log(`Application running on port ${process.env.PORT || 3000}`);
}
bootstrap();
