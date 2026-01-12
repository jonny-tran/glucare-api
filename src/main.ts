import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  app.enableCors();
  // Ensure PORT is defined
  if (!port) {
    throw new Error('PORT is not defined in environment variables');
  }
  console.log(`Server running on port http://localhost:${port}`);
  await app.listen(port);
}
void bootstrap();
