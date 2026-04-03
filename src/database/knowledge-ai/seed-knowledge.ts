/**
 * Phase 3.5 — Knowledge Ingestion (Section 2: Chẩn đoán & Phân loại, ADA 2026).
 *
 * Requires: DATABASE_URL, GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY)
 *
 * Run: pnpm db:seed:knowledge
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from '../../database/schema';
import * as schema from '../../database/schema';
import { KnowledgeSeedModule } from './knowledge-seed.module';

const CATEGORY_NAME = 'Diagnosis';

const ARTICLES: Array<{
  title: string;
  content: string;
}> = [
  {
    title:
      'Tiêu chuẩn chẩn đoán Tiểu đường thai kỳ (GDM) - Chiến lược 1 bước',
    content: `Sử dụng nghiệm pháp dung nạp glucose đường uống 75-g (OGTT). Chẩn đoán GDM khi có ít nhất một giá trị huyết tương vượt ngưỡng:

Lúc đói (Fasting): 92 mg/dL (5.1 mmol/L)

1 giờ sau uống: 180 mg/dL (10.0 mmol/L)

2 giờ sau uống: 153 mg/dL (8.5 mmol/L)`,
  },
  {
    title: 'Tiêu chuẩn chẩn đoán GDM - Chiến lược 2 bước',
    content: `- Bước 1: Test sàng lọc 50-g GLT. Nếu sau 1 giờ mức glucose ≥ 130 mg/dL (7.2 mmol/L), chuyển sang bước 2.

Bước 2: 100-g OGTT (theo Carpenter-Coustan). Chẩn đoán GDM khi có ít nhất 2 giá trị vượt ngưỡng: Lúc đói 95 mg/dL; 1 giờ 180 mg/dL; 2 giờ 155 mg/dL; 3 giờ 140 mg/dL.`,
  },
  {
    title: 'Thời điểm tầm soát và Phân loại',
    content: `Thực hiện tầm soát GDM ở tuần thứ 24–28 của thai kỳ. Đối với phụ nữ có yếu tố nguy cơ cao, cần tầm soát tiểu đường Type 2 ngay ở lần khám thai đầu tiên (Overt Diabetes) bằng các tiêu chuẩn chẩn đoán thông thường.`,
  },
];

async function ensureDiagnosisCategory(
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
        'Chẩn đoán & phân loại tiểu đường — ADA 2026, Section 2 (GDM, tầm soát).',
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
    console.log(`Seeding article: [${row.title}] — đã tồn tại, bỏ qua INSERT.`);
    articleId = existing.id;
    if (existing.embedding != null) {
      console.log(
        `Generating embedding for: [${row.title}] — đã có vector, bỏ qua.`,
      );
      return;
    }
  } else {
    console.log(`Seeding article: [${row.title}]...`);
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

  console.log(`Generating embedding for: [${row.title}]...`);
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
  console.log(`✓ Đã cập nhật embedding cho: [${row.title}]`);
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
    const category = await ensureDiagnosisCategory(db);
    for (const row of ARTICLES) {
      await upsertArticleAndEmbed(db, embeddingService, category.id, row);
    }
    console.log('\n✅ Seed knowledge (Diagnosis / GDM) hoàn tất.');
  } finally {
    await app.close();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
