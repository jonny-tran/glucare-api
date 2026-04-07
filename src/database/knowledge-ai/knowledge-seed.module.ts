import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { GoogleGenAiClientService } from '../../modules/ai/google-genai-client.service';

/**
 * Module tối thiểu cho script seed knowledge (EmbeddingService + Google GenAI embedding).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
  ],
  providers: [GoogleGenAiClientService, EmbeddingService],
})
export class KnowledgeSeedModule {}
