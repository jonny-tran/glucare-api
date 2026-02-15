import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true, // Quan trọng với NeonDB
});

async function main() {
  console.log('🛠️ Bắt đầu dọn dẹp các bảng không tương thích...');

  try {
    // 1. Xóa bảng medications cũ (Cascade sẽ xóa luôn các khóa ngoại liên quan)
    await pool.query(`DROP TABLE IF EXISTS "medications" CASCADE;`);
    console.log('✅ Đã xóa bảng cũ: medications');

    // 2. Xóa bảng meals cũ
    await pool.query(`DROP TABLE IF EXISTS "meals" CASCADE;`);
    console.log('✅ Đã xóa bảng cũ: meals');

    // 3. (Tùy chọn) Xóa các cột trong glucose_readings nếu chúng bị kẹt
    // Drizzle sẽ tự thêm lại chúng sau
    await pool.query(`
      ALTER TABLE "glucose_readings" 
      DROP COLUMN IF EXISTS "medication_id",
      DROP COLUMN IF EXISTS "meal_id";
    `);
    console.log('✅ Đã dọn dẹp cột liên kết trong glucose_readings');
  } catch (err) {
    console.error('❌ Lỗi khi dọn dẹp:', err);
  } finally {
    await pool.end();
    console.log('🏁 Hoàn tất. Bây giờ hãy chạy "pnpm db:push"');
  }
}

void main();
