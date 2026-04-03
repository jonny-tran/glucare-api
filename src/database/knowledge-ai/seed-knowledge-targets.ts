/**
 * Phase 3.5 — Knowledge Ingestion (Section 6: Mục tiêu Glycemic & tần suất theo dõi, ADA 2026).
 *
 * Upsert theo `title`: bài đã tồn tại thì cập nhật `content` + `category_id` (tương đương ON CONFLICT DO UPDATE; bảng chưa có UNIQUE(title) nên dùng find + update/insert).
 *
 * Requires: DATABASE_URL, GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY)
 *
 * Run: pnpm db:seed:knowledge-targets
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from '../../database/schema';
import * as schema from '../../database/schema';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { KnowledgeSeedModule } from './knowledge-seed.module';

const CATEGORY_NAME = 'GlycemicTargets';

const ARTICLES: Array<{ title: string; content: string }> = [
  {
    title: 'Mục tiêu Time in Range (TIR) cho người trưởng thành (T1D & T2D)',
    content: `Mục tiêu CGM cho người lớn: Khoảng mục tiêu (Time in Range — TIR) là 70–180 mg/dL (3.9–10.0 mmol/L) với mục tiêu > 70% thời gian. Thời gian trên ngưỡng (TAR) Level 1 (>180 mg/dL) < 25%, Level 2 (>250 mg/dL) < 5%. Thời gian dưới ngưỡng (TBR) Level 1 (<70 mg/dL) < 4%, Level 2 (<54 mg/dL) < 1%.`,
  },
  {
    title: 'Mục tiêu đường huyết khắt khe cho Phụ nữ mang thai (GDM/T1D/T2D)',
    content: `Phụ nữ mang thai cần ngưỡng khắt khe hơn: Khoảng mục tiêu (Time in Range — TIR) là 63–140 mg/dL (3.5–7.8 mmol/L). Mục tiêu TIR > 70% (đối với T1D). Thời gian dưới ngưỡng (TBR < 63 mg/dL) phải < 4% và thời gian trên ngưỡng (TAR > 140 mg/dL) < 25%.`,
  },
  {
    title: 'Mục tiêu đường huyết cho người cao tuổi hoặc đối tượng dễ tổn thương',
    content: `Đối với người cao tuổi hoặc sức khỏe yếu, mục tiêu TIR (70–180 mg/dL) có thể nới lỏng ở mức > 50% thời gian. Tuy nhiên, ưu tiên tuyệt đối là tránh hạ đường huyết với mục tiêu TBR < 70 mg/dL phải < 1%.`,
  },
  {
    title: 'Tiêu chuẩn HbA1c và Biến thiên đường huyết (CV)',
    content: `Mục tiêu HbA1c chung cho người lớn là < 7.0%. Chỉ số biến thiên đường huyết (%CV) mục tiêu là ≤ 36%. Nếu %CV > 36%, bệnh nhân được coi là có đường huyết không ổn định và có nguy cơ cao bị hạ đường huyết cấp độ 2.`,
  },
  {
    title: 'Khuyến nghị tần suất kiểm tra đường huyết',
    content: `Người dùng Insulin (MDI/Pump) cần đo 6–10 lần/ngày (SMBG) hoặc dùng CGM. Phụ nữ mang thai (GDM) bắt buộc đo ít nhất 4 lần/ngày: 1 lần lúc đói và 3 lần sau ăn (1 giờ hoặc 2 giờ sau bữa sáng, trưa, tối).`,
  },
];

async function ensureGlycemicTargetsCategory(
  db: ReturnType<typeof drizzle<typeof schema>>,
) {
  const existing = await db.query.categories.findFirst({
    where: and(
      eq(schema.categories.name, CATEGORY_NAME),
      isNull(schema.categories.deletedAt),
    ),
  });
  if (existing) {
    console.log(`[Category] Đã có: ${CATEGORY_NAME} (${existing.id})`);
    return existing;
  }
  const [created] = await db
    .insert(schema.categories)
    .values({
      name: CATEGORY_NAME,
      description:
        'Mục tiêu glycemic & tần suất theo dõi — ADA 2026, Section 6 (TIR, HbA1c, Biến thiên đường huyết).',
    })
    .returning();
  console.log(`[Category] Tạo mới: ${CATEGORY_NAME} (${created.id})`);
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
  console.log(`[Embedding] ✓ Đã ghi vector (${KNOWLEDGE_EMBEDDING_DIMENSION} chiều): "${row.title}"`);
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

  try {
    console.log('--- Seed Glycemic Targets (Section 6, ADA 2026) ---\n');
    const category = await ensureGlycemicTargetsCategory(db);
    for (const row of ARTICLES) {
      await upsertArticleAndEmbed(db, embeddingService, category.id, row);
      console.log('');
    }
    console.log('✅ Hoàn tất seed-knowledge-targets (5 bài).');
  } finally {
    await app.close();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
