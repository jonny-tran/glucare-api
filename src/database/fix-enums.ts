import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fixEnums() {
  try {
    await client.connect();
    console.log('Connected to database...');

    // 1. Alter columns to TEXT to remove Enum dependency
    console.log('Converting columns to TEXT...');
    await client.query(
      `ALTER TABLE "patients" ALTER COLUMN "diabetes_type" TYPE TEXT;`,
    );
    await client.query(
      `ALTER TABLE "patients" ALTER COLUMN "gender" TYPE TEXT;`,
    );
    await client.query(
      `ALTER TABLE "glucose_readings" ALTER COLUMN "reading_type" TYPE TEXT;`,
    );

    // 2. Update Data Mappings
    console.log('Updating data values...');

    // DiabetesType: TYPE_1 -> T1D, TYPE_2 -> T2D, GDM -> GDM
    await client.query(
      `UPDATE "patients" SET "diabetes_type" = 'T1D' WHERE "diabetes_type" = 'TYPE_1';`,
    );
    await client.query(
      `UPDATE "patients" SET "diabetes_type" = 'T2D' WHERE "diabetes_type" = 'TYPE_2';`,
    );

    // Set invalid values to NULL (since it's nullable in schema)
    await client.query(
      `UPDATE "patients" SET "diabetes_type" = NULL WHERE "diabetes_type" NOT IN ('GDM', 'T1D', 'T2D');`,
    );

    // Gender: MALE -> M, FEMALE -> F, OTHER -> O
    await client.query(
      `UPDATE "patients" SET "gender" = 'M' WHERE "gender" = 'MALE';`,
    );
    await client.query(
      `UPDATE "patients" SET "gender" = 'F' WHERE "gender" = 'FEMALE';`,
    );
    await client.query(
      `UPDATE "patients" SET "gender" = 'O' WHERE "gender" = 'OTHER';`,
    );

    // Set invalid values to NULL (since it's nullable)
    await client.query(
      `UPDATE "patients" SET "gender" = NULL WHERE "gender" NOT IN ('M', 'F', 'O');`,
    );

    // ReadingType: MANUAL -> Manual
    await client.query(
      `UPDATE "glucose_readings" SET "reading_type" = 'Manual' WHERE "reading_type" = 'MANUAL';`,
    );
    // ReadingType is NOT NULL, so we must ensure all are valid. Convert unknowns to 'Manual' or leave if valid.
    // Valid: CGM, SMBG, Manual
    await client.query(
      `UPDATE "glucose_readings" SET "reading_type" = 'Manual' WHERE "reading_type" NOT IN ('CGM', 'SMBG', 'Manual');`,
    );

    // 3. Drop old Enum types to allow Drizzle to recreate them cleanly
    console.log('Dropping old enum types...');
    await client.query(`DROP TYPE IF EXISTS "diabetes_type" CASCADE;`);
    await client.query(`DROP TYPE IF EXISTS "gender" CASCADE;`);
    await client.query(`DROP TYPE IF EXISTS "reading_type" CASCADE;`);

    console.log('Fix complete. You can now run "pnpm db:push".');
  } catch (err) {
    console.error('Error fixing enums:', err);
  } finally {
    await client.end();
  }
}

void fixEnums();
