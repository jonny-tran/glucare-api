CREATE TYPE "public"."chat_status" AS ENUM('Active', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('AI', 'Doctor');--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_type" "session_type" NOT NULL,
	"status" "chat_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"tir" numeric(4, 2),
	"avg_glucose" numeric(5, 2),
	"hba1c_estimate" numeric(4, 2),
	"glycemic_variability" numeric(5, 2),
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "diabetes_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."diabetes_type";--> statement-breakpoint
CREATE TYPE "public"."diabetes_type" AS ENUM('GDM', 'T1D', 'T2D');--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "diabetes_type" SET DATA TYPE "public"."diabetes_type" USING "diabetes_type"::"public"."diabetes_type";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "gender" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."gender";--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'O');--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "gender" SET DATA TYPE "public"."gender" USING "gender"::"public"."gender";--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DEFAULT 'Manual'::text;--> statement-breakpoint
DROP TYPE "public"."reading_type";--> statement-breakpoint
CREATE TYPE "public"."reading_type" AS ENUM('CGM', 'SMBG', 'Manual');--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DEFAULT 'Manual'::"public"."reading_type";--> statement-breakpoint
ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" SET DATA TYPE "public"."reading_type" USING "reading_type"::"public"."reading_type";--> statement-breakpoint
ALTER TABLE "patient_doctors" DROP CONSTRAINT "patient_doctors_patient_id_doctor_id_pk";--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "dosage" text;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "patient_doctors" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" DROP COLUMN "unit";--> statement-breakpoint
ALTER TABLE "medications" DROP COLUMN "dosage_default";