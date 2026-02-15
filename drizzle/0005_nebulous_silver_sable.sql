ALTER TABLE "medication_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "medication_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "meals" DROP CONSTRAINT "meals_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "medications" DROP CONSTRAINT "medications_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "medications" ALTER COLUMN "dosage" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD COLUMN "medication_id" uuid;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD COLUMN "meal_id" uuid;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "food_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "calories" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "carbs" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "recorded_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "medicine_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "recorded_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "carbs_estimate";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "meal_time";--> statement-breakpoint
ALTER TABLE "medications" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "medications" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "medications" DROP COLUMN "frequency";--> statement-breakpoint
ALTER TABLE "medications" DROP COLUMN "instructions";