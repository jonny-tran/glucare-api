import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GeminiClientService } from '../gemini-client.service';

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);

  constructor(private readonly geminiClient: GeminiClientService) {}

  /** Phiên âm qua Gemini đa phương thức (âm thanh từ URL). */
  async transcribeFromUrl(secureUrl: string): Promise<string> {
    try {
      const res = await fetch(secureUrl);
      if (!res.ok) {
        throw new ServiceUnavailableException(
          `Không tải được file âm thanh từ URL (HTTP ${res.status}).`,
        );
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const mime =
        res.headers.get('content-type')?.split(';')[0]?.trim() ||
        this.guessMimeFromUrl(secureUrl);
      const b64 = buf.toString('base64');

      const ai = this.geminiClient.getClient();
      const model = this.geminiClient.getChatModelId();

      const out = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Phiên âm nội dung âm thanh sau sang tiếng Việt. Chỉ trả về lời thoại, không giải thích.',
              },
              { inlineData: { mimeType: mime, data: b64 } },
            ],
          },
        ],
      });

      return (out.text ?? '').trim();
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Gemini audio transcription failed: ${msg}`);
      throw new ServiceUnavailableException(`Không thể nhận dạng giọng nói: ${msg}`);
    }
  }

  private guessMimeFromUrl(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('.wav')) return 'audio/wav';
    if (lower.includes('.m4a')) return 'audio/mp4';
    if (lower.includes('.mp3')) return 'audio/mpeg';
    return 'audio/mp3';
  }
}
