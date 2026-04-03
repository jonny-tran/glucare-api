import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

/**
 * Client Google Gen AI SDK (@google/genai) — dùng GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY).
 */
@Injectable()
export class GeminiClientService implements OnModuleInit {
  private readonly logger = new Logger(GeminiClientService.name);

  private client: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const chatModel = this.getChatModelId();
    const hasKey = !!this.tryGetApiKey();
    this.logger.log(
      `[Gemini] Chat / generateContent: model="${chatModel}" (biến môi trường AI_MODEL; mặc định gemini-2.0-flash). API key: ${hasKey ? 'đã cấu hình' : 'CHƯA có'}.`,
    );
  }

  /** Ưu tiên GEMINI_API_KEY theo tài liệu Google Gen AI. */
  getApiKey(): string {
    const k =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');
    if (!k?.trim()) {
      throw new ServiceUnavailableException(
        'Thiếu GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY) cho Google Gen AI.',
      );
    }
    return k;
  }

  tryGetApiKey(): string | null {
    const k =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_GENERATIVE_AI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');
    return k?.trim() ? k : null;
  }

  getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.getApiKey() });
      this.logger.log(
        `[Gemini] GoogleGenAI (chat) client tạo lần đầu — generateContent dùng model: "${this.getChatModelId()}"`,
      );
    }
    return this.client;
  }

  /** Client chỉ khi đã cấu hình key (embedding / script tùy chọn). */
  tryGetClient(): GoogleGenAI | null {
    const k = this.tryGetApiKey();
    if (!k) {
      return null;
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: k });
      this.logger.log(
        `[Gemini] GoogleGenAI (chat) client tạo lần đầu (tryGetClient) — model: "${this.getChatModelId()}"`,
      );
    }
    return this.client;
  }

  /** Model chat đa phương thức / tool calling (vd. gemini-2.0-flash). */
  getChatModelId(): string {
    return this.configService.get<string>('AI_MODEL') || 'gemini-2.0-flash';
  }
}
