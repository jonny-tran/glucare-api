import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { GeminiClientService } from '../../modules/ai/gemini-client.service';

/**
 * Module tối thiểu cho script seed knowledge (chỉ cần EmbeddingService + Gemini).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
  ],
  providers: [GeminiClientService, EmbeddingService],
})
export class KnowledgeSeedModule {}
