/**
 * Script dọn dẹp dữ liệu conflict trước khi push schema mới.
 * Chạy: npx tsx src/database/fix-conflict.ts
 *
 * CẢNH BÁO: Script này sẽ DROP các bảng có breaking changes.
 * Chỉ chạy trong môi trường DEV/STAGING, KHÔNG chạy trên PRODUCTION.
 */
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔧 Bắt đầu dọn dẹp dữ liệu conflict...\n');

    // 1. Drop bảng knowledge_articles cũ (category text -> categoryId uuid FK)
    console.log(
      '📦 Dropping bảng knowledge_articles (breaking: category text -> categoryId uuid FK)...',
    );
    await client.query('DROP TABLE IF EXISTS knowledge_articles CASCADE;');
    console.log('   ✅ Đã drop bảng knowledge_articles\n');

    // 2. Drop enum types cũ nếu tồn tại (để tránh conflict khi tạo mới)
    const enumsToDrop = [
      'user_status',
      'article_language',
      'system_config_key',
      'ai_feature',
      'ai_request_status',
    ];

    console.log('📦 Cleaning up enum types...');
    for (const enumName of enumsToDrop) {
      await client.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE;`);
      console.log(`   ✅ Dropped type: ${enumName}`);
    }

    // 3. Drop bảng mới nếu tồn tại (clean state)
    const tablesToDrop = ['ai_usage_logs', 'system_configs', 'categories'];

    console.log('\n📦 Dropping new tables if exist (clean state)...');
    for (const table of tablesToDrop) {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`   ✅ Dropped table: ${table}`);
    }

    // 4. Remove column is_active from users & add status column
    console.log('\n📦 Preparing users table for status migration...');
    try {
      await client.query('ALTER TABLE users DROP COLUMN IF EXISTS is_active;');
      console.log('   ✅ Dropped column is_active from users');
    } catch {
      console.log('   ℹ️  Column is_active không tồn tại hoặc đã được xóa');
    }

    // 5. Drop deleted_at if already exists on users (clean state)
    try {
      await client.query('ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;');
      console.log('   ✅ Dropped column deleted_at from users (clean state)');
    } catch {
      console.log('   ℹ️  Column deleted_at không tồn tại');
    }

    console.log('\n✅ Dọn dẹp hoàn tất! Bây giờ có thể chạy: pnpm db:push');
  } catch (error) {
    console.error('❌ Lỗi khi dọn dẹp:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
