import { Injectable, Logger } from '@nestjs/common';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from 'src/database/schema';
import { GeminiClientService } from './gemini-client.service';

const EMBEDDING_MODEL = 'text-embedding-004';
const MAX_INPUT_CHARS = 8000;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly geminiClient: GeminiClientService) {}

  /**
   * Gemini text-embedding-004 → vector dim 768 (khớp pgvector).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const ai = this.geminiClient.tryGetClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const input = text.slice(0, MAX_INPUT_CHARS);
    const res = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: input,
      config: {
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: KNOWLEDGE_EMBEDDING_DIMENSION,
      },
    });
    const values = res.embeddings?.[0]?.values;
    if (!values || values.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
      throw new Error('Invalid embedding dimensions from Gemini');
    }
    return values;
  }

  async tryGenerateEmbedding(
    text: string,
  ): Promise<{ ok: true; embedding: number[] } | { ok: false; error: string }> {
    try {
      const embedding = await this.generateEmbedding(text);
      return { ok: true, embedding };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Embedding API error: ${message}`);
      return { ok: false, error: message };
    }
  }
}
