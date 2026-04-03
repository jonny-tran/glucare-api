ALTER TABLE "chat_sessions" ADD COLUMN "title" varchar(255) DEFAULT 'Cuộc trò chuyện mới' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;