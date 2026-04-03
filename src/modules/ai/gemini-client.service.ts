import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

/**
 * Client Google Gen AI SDK (@google/genai) — dùng GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY).
 */
@Injectable()
export class GeminiClientService {
  private client: GoogleGenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

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
    }
    return this.client;
  }

  /** Model chat đa phương thức / tool calling (vd. gemini-2.0-flash). */
  getChatModelId(): string {
    return this.configService.get<string>('AI_MODEL') || 'gemini-2.0-flash';
  }
}
