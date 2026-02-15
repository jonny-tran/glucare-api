ALTER TABLE "glucose_readings" DROP CONSTRAINT "glucose_readings_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DEFAULT 'MANUAL'::text;--> statement-breakpoint
DROP TYPE "public"."reading_type";--> statement-breakpoint
CREATE TYPE "public"."reading_type" AS ENUM('CGM', 'SMBG', 'MANUAL');--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DEFAULT 'MANUAL'::"public"."reading_type";--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DATA TYPE "public"."reading_type" USING "reading_type"::"public"."reading_type";--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD COLUMN "recorded_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_readings" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "glucose_readings" DROP COLUMN "reading_time";