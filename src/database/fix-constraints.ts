import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('Fixing database constraints...');

  try {
    // Drop old foreign key constraints if they exist
    await pool.query(`
      DO $$ 
      BEGIN 
        -- Drop medication_log_id constraint
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'glucose_readings_medication_log_id_medication_logs_id_fk') THEN
          ALTER TABLE "glucose_readings" DROP CONSTRAINT "glucose_readings_medication_log_id_medication_logs_id_fk";
        END IF;

        -- Drop meal_log_id constraint
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'glucose_readings_meal_log_id_meals_id_fk') THEN
          ALTER TABLE "glucose_readings" DROP CONSTRAINT "glucose_readings_meal_log_id_meals_id_fk";
        END IF;
      END $$;
    `);

    console.log('Dropped old constraints (if existed)');

    // Drop old columns to clear conflicts
    await pool.query(`
      ALTER TABLE "glucose_readings" DROP COLUMN IF EXISTS "medication_log_id";
      ALTER TABLE "glucose_readings" DROP COLUMN IF EXISTS "meal_log_id";
    `);
    console.log('Dropped old columns from glucose_readings');

    // Drop old tables if they interfere (medication_logs is replaced by medications)
    // NOTE: 'medications' table is actually being created or modified heavily.
    // The logs showed: "medication_logs" table is dropped.
    await pool.query(`DROP TABLE IF EXISTS "medication_logs" CASCADE;`);
    console.log('Dropped medication_logs table');
  } catch (err) {
    console.error('Error fixing constraints:', err);
  } finally {
    await pool.end();
  }
}

void main();
