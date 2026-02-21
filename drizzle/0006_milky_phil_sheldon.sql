CREATE TABLE "doctor_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fcm_token" text NOT NULL,
	"device_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_tokens_fcm_token_unique" UNIQUE("fcm_token")
);
--> statement-breakpoint
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "reminders" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."reminder_type";--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('MEDICINE', 'MEASUREMENT');--> statement-breakpoint
ALTER TABLE "reminders" ALTER COLUMN "type" SET DATA TYPE "public"."reminder_type" USING "type"::"public"."reminder_type";--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "medication_id" uuid;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "timezone" text DEFAULT 'Asia/Ho_Chi_Minh';--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_tokens" ADD CONSTRAINT "notification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_doctors_unq" ON "patient_doctors" USING btree ("patient_id","doctor_id");--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "is_enabled";