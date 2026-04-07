import { Injectable } from '@nestjs/common';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  MealContext,
  ReadingType,
} from 'src/modules/glucose/dto/create-glucose.dto';
import { GlucoseService } from 'src/modules/glucose/glucose.service';
import { GroqClientService } from '../groq-client.service';
import type { HealthMediaProcessResult } from '../types/health-media.types';
import { OcrService } from './ocr.service';
import { SpeechToTextService } from './speech-to-text.service';

const GLUCOSE_MIN = 20;
const GLUCOSE_MAX = 600;

const extractionSchema = z.object({
  glucoseValueMgDl: z.number(),
  mealContext: z.enum([
    'BEFORE_MEAL',
    'AFTER_MEAL',
    'FASTING',
    'BEDTIME',
  ]),
  readingType: z.enum(['MANUAL', 'SMBG', 'CGM']).default('MANUAL'),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
  /** Mô tả ngắn ngữ cảnh (vd: sau bữa tối) */
  contextSummary: z.string(),
});

@Injectable()
export class HealthMediaService {
  constructor(
    private readonly groqClient: GroqClientService,
    private readonly speechToTextService: SpeechToTextService,
    private readonly ocrService: OcrService,
    private readonly glucoseService: GlucoseService,
  ) {}

  /**
   * Xử lý media đã upload lên Cloudinary (secure URL HTTPS).
   */
  async processBySecureUrl(
    secureUrl: string,
    fileType: 'audio' | 'image',
    userId: string,
  ): Promise<HealthMediaProcessResult> {
    let rawTranscript = '';
    try {
      if (fileType === 'audio') {
        rawTranscript =
          await this.speechToTextService.transcribeFromUrl(secureUrl);
      } else {
        rawTranscript =
          await this.ocrService.describeMeterImageFromUrl(secureUrl);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: msg,
        code: fileType === 'audio' ? 'TRANSCRIPTION_FAILED' : 'OCR_FAILED',
      };
    }

    if (!rawTranscript.trim()) {
      return {
        ok: false,
        error: 'Không có nội dung sau khi xử lý file.',
        code: 'EXTRACTION_FAILED',
      };
    }

    return this.extractStructuredFromText(rawTranscript, userId);
  }

  async extractStructuredFromText(
    rawText: string,
    userId: string,
  ): Promise<HealthMediaProcessResult> {
    try {
      const model = this.groqClient.getLanguageModel();
      const prompt = [
        'Trích xuất chỉ số đường huyết từ đoạn văn (có thể là lời nói hoặc mô tả màn hình máy đo).',
        'Đơn vị chuẩn: mg/dL. Nếu user nói mmol/L, quy đổi sang mg/dL (×18).',
        'Nếu không chắc mealContext, dùng FASTING.',
        'confidence: 0–1 độ tin cậy của việc trích xuất.',
        '',
        '---',
        rawText,
      ].join('\n');

      const { object } = await generateObject({
        model,
        schema: extractionSchema,
        prompt,
      });

      const value = Math.round(object.glucoseValueMgDl * 10) / 10;
      if (value < GLUCOSE_MIN || value > GLUCOSE_MAX) {
        return {
          ok: false,
          error: `Giá trị ${value} mg/dL nằm ngoài ngưỡng cho phép (${GLUCOSE_MIN}–${GLUCOSE_MAX} mg/dL).`,
          code: 'VALUE_OUT_OF_RANGE',
        };
      }

      const last = await this.glucoseService.getLatestReading(userId);
      let lastReadingValue: number | undefined;
      let unusualSpike = false;
      if (last) {
        lastReadingValue = parseFloat(last.glucoseValue);
        const delta = Math.abs(value - lastReadingValue);
        const ratioHigh =
          lastReadingValue > 0 ? value / lastReadingValue : Infinity;
        const ratioLow =
          lastReadingValue > 0 ? value / lastReadingValue : 0;
        if (
          delta > 150 ||
          ratioHigh > 2.5 ||
          (ratioLow > 0 && ratioLow < 0.4)
        ) {
          unusualSpike = true;
        }
      }

      const context = object.contextSummary.trim() || 'Không rõ ngữ cảnh';

      return {
        ok: true,
        extracted: {
          value,
          context,
          confidence: object.confidence,
          mealContext: object.mealContext as MealContext,
          readingType: object.readingType as ReadingType,
          notes: object.notes,
          rawTranscript: rawText,
          unusualSpike,
          lastReadingValue,
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: `Không trích xuất được chỉ số có cấu trúc: ${msg}`,
        code: 'EXTRACTION_FAILED',
      };
    }
  }
}
