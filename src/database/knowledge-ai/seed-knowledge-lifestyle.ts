/**
 * Phase 3.5 — Knowledge Ingestion (Section 5: Lối sống & Dinh dưỡng — MNT, ADA 2026).
 *
 * Upsert theo `title`: cập nhật nội dung + embedding 768 chiều (KNOWLEDGE_EMBEDDING_DIMENSION).
 *
 * Requires: DATABASE_URL, GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY)
 *
 * Run: pnpm db:seed:knowledge-lifestyle
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from '../../database/schema';
import * as schema from '../schema';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { KnowledgeSeedModule } from './knowledge-seed.module';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Nutrition:
    'Dinh dưỡng & MNT — ADA 2026, Section 5 (chất xơ, GI, mẫu ăn uống).',
  Exercise:
    'Vận động — ADA 2026, Section 5 (Aerobic 150 phút/tuần, kháng lực, ngắt quãng ngồi).',
  Lifestyle:
    'Lối sống & chuyển hóa — ADA 2026 (mục tiêu cân nặng, insulin sensitivity).',
};

const ARTICLES: Array<{
  title: string;
  content: string;
  categoryName: keyof typeof CATEGORY_DESCRIPTIONS;
}> = [
  {
    categoryName: 'Nutrition',
    title: 'Tiêu chuẩn Dinh dưỡng và Chất xơ (MNT)',
    content: `Theo ADA 2026, liệu pháp dinh dưỡng y khoa (MNT) khuyến nghị tiêu thụ tối thiểu 14g chất xơ cho mỗi 1.000 kcal nạp vào hàng ngày. Ngưỡng định lượng thường dùng cho truy vấn số và cảnh báo: 14g/1000kcal. Người bệnh nên ưu tiên thực phẩm có chỉ số đường huyết thấp (Low GI), thay thế hoàn toàn đồ uống có đường (SSBs) bằng nước lọc hoặc đồ uống không calo. Không có tỷ lệ tinh bột (Carbohydrate) cố định, việc phân bổ phải cá nhân hóa dựa trên mức độ hoạt động và thuốc.`,
  },
  {
    categoryName: 'Nutrition',
    title: 'Các mẫu ăn uống lành mạnh khuyến nghị',
    content: `Các mẫu ăn uống mang lại lợi ích cho người tiểu đường bao gồm: Chế độ ăn Địa Trung Hải (Mediterranean), DASH và Low-carbohydrate. Tập trung vào việc giảm thiểu carbohydrate tinh chế và đường bổ sung, đồng thời tăng cường rau xanh, các loại hạt và thực phẩm nguyên phần để duy trì đường huyết ổn định.`,
  },
  {
    categoryName: 'Exercise',
    title: 'Tiêu chuẩn vận động Aerobic và Quy tắc không nghỉ 2 ngày',
    content: `Người trưởng thành mắc tiểu đường nên thực hiện ít nhất 150 phút/tuần vận động Aerobic cường độ trung bình đến mạnh (tương đương tối thiểu 150 phút mỗi tuần). Một quy tắc sống còn là không được nghỉ tập quá 2 ngày liên tiếp. Hoạt động nên được chia đều ít nhất 3 ngày trong tuần để duy trì sự nhạy bén của Insulin.`,
  },
  {
    categoryName: 'Exercise',
    title: 'Bài tập Kháng lực và Ngắt quãng ngồi lâu',
    content: `Nên tập kháng lực (Resistance Training) 2–3 buổi/tuần vào các ngày không liên tiếp. Mỗi buổi gồm 8–10 bài tập cho các nhóm cơ lớn, thực hiện 1–3 hiệp, mỗi hiệp 10–15 lần lặp. Ngoài ra, cần ngắt quãng thời gian ngồi lâu: sau mỗi 30 phút ngồi lâu, thực hiện ít nhất 3 phút hoạt động nhẹ như đi bộ hoặc duỗi người.`,
  },
  {
    categoryName: 'Lifestyle',
    title: 'Mục tiêu giảm cân và Chuyển hóa',
    content: `Đối với người thừa cân/béo phì, mục tiêu giảm từ 5–7% trọng lượng cơ thể ban đầu (5-7% trọng lượng khởi điểm) là ngưỡng quan trọng để cải thiện rõ rệt mức độ nhạy Insulin và các chỉ số chuyển hóa. Việc quản lý cân nặng cần được hỗ trợ bởi cả thay đổi dinh dưỡng và tăng cường hoạt động thể chất bền vững.`,
  },
];

async function ensureCategory(
  db: ReturnType<typeof drizzle<typeof schema>>,
  name: string,
  description: string,
) {
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(schema.categories.name, name),
      isNull(schema.categories.deletedAt),
    ),
  });
  if (existing) {
    console.log(`[Category] Đã có: ${name} (${existing.id})`);
    return existing;
  }
  const [created] = await db
    .insert(schema.categories)
    .values({ name, description })
    .returning();
  console.log(`[Category] Tạo mới: ${name} (${created.id})`);
  return created;
}

async function upsertArticleAndEmbed(
  db: ReturnType<typeof drizzle<typeof schema>>,
  embeddingService: EmbeddingService,
  categoryId: string,
  row: { title: string; content: string },
) {
  const existing = await db.query.knowledgeArticles.findFirst({
    where: and(
      eq(schema.knowledgeArticles.title, row.title),
      isNull(schema.knowledgeArticles.deletedAt),
    ),
  });

  let articleId: string;

  if (existing) {
    console.log(
      `[Upsert] Đã có bài theo title — cập nhật nội dung: "${row.title}"`,
    );
    await db
      .update(schema.knowledgeArticles)
      .set({
        content: row.content,
        categoryId,
        language: 'VI',
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.knowledgeArticles.id, existing.id));
    articleId = existing.id;
  } else {
    console.log(`[Insert] Nạp bài mới: "${row.title}"`);
    const [inserted] = await db
      .insert(schema.knowledgeArticles)
      .values({
        title: row.title,
        content: row.content,
        categoryId,
        language: 'VI',
        isPublished: true,
      })
      .returning({ id: schema.knowledgeArticles.id });
    articleId = inserted.id;
  }

  console.log(`[Embedding] Generating embedding for: "${row.title}"...`);
  const text = `${row.title}\n\n${row.content}`.slice(0, 8000);
  const vector = await embeddingService.generateEmbedding(text);
  if (vector.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: got ${vector.length}, expected ${KNOWLEDGE_EMBEDDING_DIMENSION}`,
    );
  }
  const literal = `[${vector.join(',')}]`;
  await db.execute(sql`
    UPDATE knowledge_articles
    SET
      embedding = ${sql.raw(`'${literal}'::vector`)},
      updated_at = NOW()
    WHERE id = ${articleId}
  `);
  console.log(`Seeded Lifestyle Article: [${row.title}] successfully`);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required');
  }
  const hasGemini =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!hasGemini) {
    throw new Error(
      'GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY) is required',
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    max: 5,
  });
  const db = drizzle(pool, { schema });

  const app = await NestFactory.createApplicationContext(KnowledgeSeedModule, {
    logger: ['error', 'warn'],
  });
  const embeddingService = app.get(EmbeddingService);

  const categoryIds = new Map<string, string>();
  for (const name of Object.keys(CATEGORY_DESCRIPTIONS) as Array<
    keyof typeof CATEGORY_DESCRIPTIONS
  >) {
    const cat = await ensureCategory(
      db,
      name,
      CATEGORY_DESCRIPTIONS[name],
    );
    categoryIds.set(name, cat.id);
  }

  try {
    console.log('--- Seed Lifestyle & Nutrition (Section 5, ADA 2026) ---\n');
    for (const row of ARTICLES) {
      const cid = categoryIds.get(row.categoryName);
      if (!cid) throw new Error(`Missing category: ${row.categoryName}`);
      await upsertArticleAndEmbed(db, embeddingService, cid, {
        title: row.title,
        content: row.content,
      });
      console.log('');
    }
    console.log('✅ Hoàn tất seed-knowledge-lifestyle (5 bài).');
  } finally {
    await app.close();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
