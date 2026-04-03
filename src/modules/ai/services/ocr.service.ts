import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GeminiClientService } from '../gemini-client.service';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly geminiClient: GeminiClientService) {}

  /** Đọc số trên màn hình máy đo từ ảnh (URL Cloudinary). */
  async describeMeterImageFromUrl(secureUrl: string): Promise<string> {
    try {
      const res = await fetch(secureUrl);
      if (!res.ok) {
        throw new ServiceUnavailableException(
          `Không tải được ảnh từ URL (HTTP ${res.status}).`,
        );
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const mime =
        res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
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
                  'Bạn là trợ lý đọc màn hình máy đo đường huyết. Mô tả ngắn gọn: số đo (mg/dL nếu thấy), ' +
                  'và mọi chữ số hoặc nhãn liên quan. Nếu không chắc, nói "không chắc". Tiếng Việt.',
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
      this.logger.warn(`Gemini vision OCR failed: ${msg}`);
      throw new ServiceUnavailableException(`Không đọc được ảnh máy đo: ${msg}`);
    }
  }
}
