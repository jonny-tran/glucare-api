import { ApiError } from '@google/genai';

/** Thông báo khi Gemini trả 429 / hết quota — không lộ chi tiết kỹ thuật. */
export const GEMINI_MAINTENANCE_MESSAGE_VI =
  'Trợ lý AI đang tạm bảo trì do giới hạn dịch vụ. Vui lòng thử lại sau ít phút.';

/**
 * Phát hiện lỗi quota / rate limit từ Generative Language API (thường HTTP 429, RESOURCE_EXHAUSTED).
 */
export function isGeminiQuotaOrRateLimitError(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 429) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('RESOURCE_EXHAUSTED')) {
    return true;
  }
  if (/\b429\b/.test(msg) && /quota|rate|exceeded|RESOURCE_EXHAUSTED/i.test(msg)) {
    return true;
  }
  if (/exceeded your current quota/i.test(msg)) {
    return true;
  }
  return false;
}
