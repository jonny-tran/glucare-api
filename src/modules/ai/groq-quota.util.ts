import { APICallError } from 'ai';

/** Thông báo khi Groq trả 429 / rate limit — không lộ chi tiết kỹ thuật. */
export const GROQ_MAINTENANCE_MESSAGE_VI =
  'Trợ lý AI đang tạm bảo trì do giới hạn dịch vụ. Vui lòng thử lại sau ít phút.';

/**
 * Phát hiện lỗi quota / rate limit từ Groq hoặc HTTP 429.
 */
export function isGroqRateLimitError(err: unknown): boolean {
  if (APICallError.isInstance(err) && err.statusCode === 429) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/\b429\b/.test(msg) && /rate|limit|quota|throttl/i.test(msg)) {
    return true;
  }
  if (/too many requests/i.test(msg)) {
    return true;
  }
  return false;
}
