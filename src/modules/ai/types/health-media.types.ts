import type { MealContext, ReadingType } from 'src/modules/glucose/dto/create-glucose.dto';

/** Kết quả trích xuất từ giọng nói / OCR trước khi lưu E-04 */
export type PendingGlucosePayload = {
  glucoseValue: number;
  mealContext: MealContext;
  readingType: ReadingType;
  notes?: string;
  recordedAtIso: string;
  confidence: number;
  rawTranscript: string;
  unusualSpike: boolean;
  lastReadingValue?: number;
  /** Public ID Cloudinary để xóa asset sau khi xác nhận / hủy */
  cloudinaryPublicId?: string;
  /** resource_type Cloudinary (image | video | raw) — cần cho uploader.destroy */
  cloudinaryResourceType?: string;
};

export type HealthMediaProcessResult =
  | {
      ok: true;
      extracted: {
        value: number;
        context: string;
        confidence: number;
        mealContext: MealContext;
        readingType: ReadingType;
        notes?: string;
        rawTranscript: string;
        unusualSpike: boolean;
        lastReadingValue?: number;
      };
    }
  | {
      ok: false;
      error: string;
      code:
        | 'VALUE_OUT_OF_RANGE'
        | 'TRANSCRIPTION_FAILED'
        | 'OCR_FAILED'
        | 'EXTRACTION_FAILED'
        | 'FILE_INVALID';
    };
