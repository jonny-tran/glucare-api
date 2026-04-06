ALTER TABLE "users" ADD COLUMN "subscription_tier" varchar(20) DEFAULT 'TRIAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_expiry" timestamp;