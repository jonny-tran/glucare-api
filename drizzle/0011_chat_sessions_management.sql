-- E-13 Phase 2.5: Quản lý phiên chat (tiêu đề, soft-delete, sắp xếp theo hoạt động)
-- Chạy sau khi deploy: `pnpm drizzle-kit migrate` hoặc áp dụng thủ công lên PostgreSQL.
-- FK chat_messages.session_id → chat_sessions.id với ON DELETE CASCADE đã được Drizzle định nghĩa; kiểm tra DB thực tế nếu cần.

ALTER TABLE "chat_sessions"
  ADD COLUMN IF NOT EXISTS "title" varchar(255) NOT NULL DEFAULT 'Cuộc trò chuyện mới';

ALTER TABLE "chat_sessions"
  ADD COLUMN IF NOT EXISTS "is_deleted" boolean NOT NULL DEFAULT false;

ALTER TABLE "chat_sessions"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

UPDATE "chat_sessions"
SET "updated_at" = COALESCE("created_at", now());
