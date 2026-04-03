import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from '../../database/schema';
import { GeminiClientService } from './gemini-client.service';

/**
 * Model mặc định theo tài liệu Gemini API hiện tại.
 * `text-embedding-004` thường trả 404 trên Generative Language API (v1beta) — dùng
 * `gemini-embedding-001` + `outputDimensionality: KNOWLEDGE_EMBEDDING_DIMENSION`.
 * Ghi đè bằng biến môi trường GEMINI_EMBEDDING_MODEL nếu cần.
 */
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001';

const MAX_INPUT_CHARS = 8000;

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);

  /** Client riêng cho embedding (có thể khác apiVersion so với chat). */
  private embeddingGoogleAi: GoogleGenAI | null = null;

  constructor(
    private readonly geminiClient: GeminiClientService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.log(
      `[Gemini] Embedding: model="${this.getEmbeddingModelId()}" (GEMINI_EMBEDDING_MODEL; mặc định ${DEFAULT_EMBEDDING_MODEL}), apiVersion=${this.getEmbeddingApiVersion()}, vector dim=${KNOWLEDGE_EMBEDDING_DIMENSION}`,
    );
  }

  private getEmbeddingModelId(): string {
    return (
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL')?.trim() ||
      DEFAULT_EMBEDDING_MODEL
    );
  }

  /**
   * Mặc định `v1beta` (SDK @google/genai). Có thể đặt GEMINI_EMBEDDING_API_VERSION=v1 nếu cần thử nghiệm.
   */
  private getEmbeddingApiVersion(): string {
    return (
      this.configService.get<string>('GEMINI_EMBEDDING_API_VERSION')?.trim() ||
      'v1beta'
    );
  }

  private getGoogleAiForEmbeddings(): GoogleGenAI {
    const apiKey = this.geminiClient.tryGetApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    if (!this.embeddingGoogleAi) {
      const apiVersion = this.getEmbeddingApiVersion();
      this.embeddingGoogleAi = new GoogleGenAI({ apiKey, apiVersion });
      this.logger.log(
        `Embedding client: apiVersion=${apiVersion}, model=${this.getEmbeddingModelId()}, dim=${KNOWLEDGE_EMBEDDING_DIMENSION}`,
      );
    }
    return this.embeddingGoogleAi;
  }

  /**
   * Gemini embedding → vector dim KNOWLEDGE_EMBEDDING_DIMENSION (khớp pgvector).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const ai = this.getGoogleAiForEmbeddings();
    const model = this.getEmbeddingModelId();
    const input = text.slice(0, MAX_INPUT_CHARS);

    try {
      const res = await ai.models.embedContent({
        model,
        contents: input,
        config: {
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: KNOWLEDGE_EMBEDDING_DIMENSION,
        },
      });

      const values = res.embeddings?.[0]?.values;
      if (!values?.length) {
        const preview = JSON.stringify(res).slice(0, 2000);
        this.logger.error(
          `embedContent: missing embeddings[0].values. Response preview: ${preview}`,
        );
        throw new Error(
          'Gemini embedContent: không có embeddings[0].values (xem log).',
        );
      }

      if (values.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
        this.logger.error(
          `embedContent: dimension mismatch — got ${values.length}, expected ${KNOWLEDGE_EMBEDDING_DIMENSION} (model=${model})`,
        );
        throw new Error(
          `Invalid embedding dimensions from Gemini: got ${values.length}, expected ${KNOWLEDGE_EMBEDDING_DIMENSION}`,
        );
      }

      return values;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `embedContent failed — model=${model}, apiVersion=${this.getEmbeddingApiVersion()}, dim=${KNOWLEDGE_EMBEDDING_DIMENSION}: ${msg}`,
        stack,
      );
      throw err instanceof Error ? err : new Error(msg);
    }
  }

  async tryGenerateEmbedding(
    text: string,
  ): Promise<{ ok: true; embedding: number[] } | { ok: false; error: string }> {
    try {
      const embedding = await this.generateEmbedding(text);
      return { ok: true, embedding };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.warn(
        `Embedding API error (tryGenerateEmbedding): ${message}`,
        stack,
      );
      return { ok: false, error: message };
    }
  }
}
