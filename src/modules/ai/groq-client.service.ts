import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGroq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';

/** Llama 3.1 8B — nhẹ, rẻ, phù hợp chat/tool cơ bản (thay llama3-70b-8192 đã sunset). */
const DEFAULT_CHAT_MODEL = 'llama-3.1-8b-instant';

/**
 * Client Groq qua @ai-sdk/groq — biến môi trường GROQ_API_KEY.
 * Model mặc định: llama-3.1-8b-instant (ghi đè bằng GROQ_MODEL nếu cần, vd. llama-3.3-70b-versatile).
 */
@Injectable()
export class GroqClientService implements OnModuleInit {
  private readonly logger = new Logger(GroqClientService.name);

  private groq: ReturnType<typeof createGroq> | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const chatModel = this.getChatModelId();
    const hasKey = !!this.tryGetApiKey();
    this.logger.log(
      `[Groq] Chat / generateText: model="${chatModel}" (GROQ_MODEL; mặc định ${DEFAULT_CHAT_MODEL}). API key: ${hasKey ? 'đã cấu hình' : 'CHƯA có'}.`,
    );
  }

  getApiKey(): string {
    const k = this.configService.get<string>('GROQ_API_KEY')?.trim();
    if (!k) {
      throw new ServiceUnavailableException(
        'Thiếu GROQ_API_KEY cho Groq (Vercel AI SDK / @ai-sdk/groq).',
      );
    }
    return k;
  }

  tryGetApiKey(): string | null {
    const k = this.configService.get<string>('GROQ_API_KEY')?.trim();
    return k || null;
  }

  getGroq(): ReturnType<typeof createGroq> {
    if (!this.groq) {
      this.groq = createGroq({ apiKey: this.getApiKey() });
      this.logger.log(
        `[Groq] Provider tạo lần đầu — model chat: "${this.getChatModelId()}"`,
      );
    }
    return this.groq;
  }

  tryGetGroq(): ReturnType<typeof createGroq> | null {
    const k = this.tryGetApiKey();
    if (!k) {
      return null;
    }
    if (!this.groq) {
      this.groq = createGroq({ apiKey: k });
      this.logger.log(
        `[Groq] Provider tạo lần đầu (tryGetGroq) — model: "${this.getChatModelId()}"`,
      );
    }
    return this.groq;
  }

  /** Model chat cho generateText / tool calling. */
  getChatModelId(): string {
    return (
      this.configService.get<string>('GROQ_MODEL')?.trim() || DEFAULT_CHAT_MODEL
    );
  }

  getLanguageModel(modelId?: string): LanguageModel {
    return this.getGroq()(modelId ?? this.getChatModelId());
  }

  tryGetLanguageModel(modelId?: string): LanguageModel | null {
    const g = this.tryGetGroq();
    if (!g) {
      return null;
    }
    return g(modelId ?? this.getChatModelId());
  }
}
