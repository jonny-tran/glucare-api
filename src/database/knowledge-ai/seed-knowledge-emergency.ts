/**
 * Phase 3.5 — Knowledge Ingestion (Section 6.4: Xử lý cấp cứu Hạ đường huyết, ADA 2026).
 *
 * Upsert theo `title`: cập nhật nội dung mới nhất + embedding 768 chiều (KNOWLEDGE_EMBEDDING_DIMENSION).
 *
 * Requires: DATABASE_URL, GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY) — load từ .env qua dotenv/config.
 *
 * Run: pnpm db:seed:knowledge-emergency
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from 'src/database/schema';
import * as schema from '../../database/schema';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { KnowledgeSeedModule } from './knowledge-seed.module';

const CATEGORY_NAME = 'Emergency';

const ARTICLES: Array<{ title: string; content: string }> = [
  {
    title: 'Phân loại các cấp độ Hạ đường huyết theo ADA 2026',
    content: `Hạ đường huyết được chia làm 3 cấp độ:

Cấp độ 1 (Level 1): Glucose < 70 mg/dL (3.9 mmol/L) và ≥ 54 mg/dL.

Cấp độ 2 (Level 2): Glucose < 54 mg/dL (3.0 mmol/L) - Ngưỡng nghiêm trọng trên lâm sàng.

Cấp độ 3 (Level 3): Không xác định bằng số, người bệnh bị suy giảm nhận thức hoặc thể chất cần sự hỗ trợ của người khác.`,
  },
  {
    title: 'Quy trình xử lý Hạ đường huyết - Quy tắc 15-15',
    content: `Khi Glucose < 70 mg/dL, thực hiện quy tắc 15-15:

Bước 1: Nạp 15g Carbohydrate hấp thụ nhanh (3-4 viên đường glucose, 120ml nước ép trái cây, hoặc 1 thìa mật ong).

Bước 2: Đợi 15 phút và đo lại đường huyết.

Bước 3: Nếu vẫn < 70 mg/dL, lặp lại bước 1. Nếu đã ≥ 70 mg/dL, ăn một bữa phụ có protein và carb phức hợp để ổn định.
Lưu ý: Nếu dùng thuốc acarbose, bắt buộc dùng glucose tinh khiết (viên đường).`,
  },
  {
    title: 'Nhận diện triệu chứng Hạ đường huyết sớm và muộn',
    content: `Triệu chứng sớm (Thần kinh tự chủ): Run rẩy, vã mồ hôi, tim đập nhanh, đói cồn cào, lo lắng. Triệu chứng muộn (Thần kinh thiếu đường): Lú lẫn, hoa mắt, nhìn mờ, khó nói, chóng mặt, co giật hoặc bất tỉnh. Người bệnh cần nhận biết sớm các dấu hiệu này để xử lý ngay từ Cấp độ 1.`,
  },
  {
    title: 'Hạ đường huyết không nhận biết (Unawareness) và Glucagon',
    content: `Một số bệnh nhân mất khả năng nhận biết triệu chứng sớm (Hypoglycemia Unawareness), cực kỳ nguy hiểm. ADA 2026 khuyến nghị các đối tượng có nguy cơ hạ đường huyết Cấp độ 2 hoặc 3 phải được kê đơn Glucagon và hướng dẫn người thân cách sử dụng trong trường hợp khẩn cấp.`,
  },
];

async function ensureEmergencyCategory(
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
        'Xử lý cấp cứu hạ đường huyết — ADA 2026, Section 6.4 (Phân loại, Quy tắc 15-15, triệu chứng, Glucagon).',
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
  console.log(
    `Seeded Emergency Article: [${row.title}] successfully`,
  );
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
    console.log('--- Seed Emergency Knowledge (Section 6.4, ADA 2026) ---\n');
    const category = await ensureEmergencyCategory(db);
    for (const row of ARTICLES) {
      await upsertArticleAndEmbed(db, embeddingService, category.id, row);
      console.log('');
    }
    console.log('✅ Hoàn tất seed-knowledge-emergency (4 bài).');
  } finally {
    await app.close();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
