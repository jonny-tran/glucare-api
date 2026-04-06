CREATE TYPE "public"."subscription_tier" AS ENUM('TRIAL', 'MONTHLY', 'YEARLY', 'LIFETIME');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "subscription_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"transaction_id" uuid,
	"old_tier" varchar(20),
	"new_tier" varchar(20),
	"old_expiry" timestamp,
	"new_expiry" timestamp,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "subscription_tier" SET DEFAULT 'TRIAL'::"public"."subscription_tier";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "subscription_tier" SET DATA TYPE "public"."subscription_tier" USING "subscription_tier"::"public"."subscription_tier";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" "transaction_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;