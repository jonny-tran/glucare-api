CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."chat_message_role";--> statement-breakpoint
CREATE TYPE "public"."chat_message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "role" SET DATA TYPE "public"."chat_message_role" USING "role"::"public"."chat_message_role";--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_articles_embedding_hnsw_idx" ON "knowledge_articles" USING hnsw ("embedding" vector_cosine_ops);