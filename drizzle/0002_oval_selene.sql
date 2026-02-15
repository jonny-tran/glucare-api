CREATE TYPE "public"."connection_type" AS ENUM('BLUETOOTH', 'API', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('CGM', 'SMBG', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."meal_context" AS ENUM('BEFORE_MEAL', 'AFTER_MEAL', 'FASTING', 'BEDTIME');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');--> statement-breakpoint
CREATE TYPE "public"."reading_type" AS ENUM('CGM', 'SMBG', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('MEDICATION', 'GLUCOSE', 'MEAL', 'EXERCISE');--> statement-breakpoint
CREATE TABLE "data_sharing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true,
	"start_date" date,
	"end_date" date,
	"permissions" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"device_type" "device_type" NOT NULL,
	"serial_number" text,
	"last_sync" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "glucose_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"glucose_value" numeric(5, 2) NOT NULL,
	"reading_type" "reading_type" DEFAULT 'MANUAL' NOT NULL,
	"meal_context" "meal_context" NOT NULL,
	"reading_time" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"thumbnail_url" text,
	"is_published" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"description" text NOT NULL,
	"carbs_estimate" numeric(5, 2),
	"image_url" text,
	"meal_time" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_id" uuid,
	"dosage_taken" numeric(5, 2) NOT NULL,
	"taken_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'mg',
	"dosage_default" numeric(5, 2),
	"frequency" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "reminder_type" NOT NULL,
	"time" text NOT NULL,
	"days_of_week" json,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_license_number_unique";--> statement-breakpoint
ALTER TABLE "doctors" ALTER COLUMN "license_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "diagnosis_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "data_sharing" ADD CONSTRAINT "data_sharing_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sharing" ADD CONSTRAINT "data_sharing_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" DROP COLUMN "full_name";--> statement-breakpoint
ALTER TABLE "doctors" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "doctors" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "full_name";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_phone_verified";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "deleted_at";