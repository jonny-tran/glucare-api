/**
 * Medical dialogue–style cases (MedDialog-inspired structure: Bệnh nhân / Bác sĩ).
 * Nội dung tiếng Việt do dự án biên soạn cho RAG; không phải dữ liệu crawl gốc MedDialog.
 * Tham khảo bài báo: Chen et al., MedDialog (arXiv:2004.03329). Bản quyền dữ liệu gốc thuộc các nguồn đã nêu trong thẻ dataset.
 *
 * Upsert theo `title` + embedding 768 (KNOWLEDGE_EMBEDDING_DIMENSION).
 *
 * Run: pnpm db:seed:knowledge-med-dialog
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from '../schema';
import * as schema from '../schema';
import { EmbeddingService } from '../../modules/ai/embedding.service';
import { KnowledgeSeedModule } from './knowledge-seed.module';

const CATEGORY_NAME = 'MedicalCase';

const ARTICLES: Array<{ title: string; content: string }> = [
  {
    title: 'Tư vấn triệu chứng khát nước và đi tiểu nhiều',
    content: `[Bệnh nhân]: Dạo gần đây tôi rất hay khát nước, uống bao nhiêu cũng không đủ và đi tiểu liên tục, đặc biệt là ban đêm. Tôi có bị tiểu đường không?

[Bác sĩ]: Triệu chứng khát nhiều (polydipsia) và tiểu nhiều (polyuria) là những dấu hiệu điển hình của đường huyết cao. Bạn cần làm xét nghiệm đường huyết lúc đói (FPG) và HbA1c ngay. Đừng quá lo lắng nhưng hãy đi khám sớm để có kết quả chính xác.`,
  },
  {
    title: 'Tư vấn về việc dùng thuốc Metformin',
    content: `[Bệnh nhân]: Tôi mới uống Metformin được 2 ngày và cảm thấy hơi đầy bụng, buồn nôn. Tôi có nên dừng thuốc không?

[Bác sĩ]: Đây là tác dụng phụ thường gặp của Metformin khi mới bắt đầu. Bạn nên uống thuốc ngay sau bữa ăn để giảm kích ứng dạ dày. Thông thường các triệu chứng này sẽ hết sau 1-2 tuần. Nếu tình trạng trầm trọng hơn, hãy báo lại cho bác sĩ để điều chỉnh liều lượng.`,
  },
  {
    title: 'Lo lắng về vết thương lâu lành ở chân',
    content: `[Bệnh nhân]: Tôi bị tiểu đường Type 2, có một vết xước nhỏ ở ngón chân nhưng 2 tuần rồi vẫn chưa đóng vảy.

[Bác sĩ]: Đây là dấu hiệu cảnh báo nguy hiểm. Lượng đường cao làm giảm khả năng tuần hoàn và miễn dịch, khiến vết thương dễ nhiễm trùng. Bạn cần rửa sạch bằng nước muối sinh lý, băng nhẹ và đi khám chuyên khoa bàn chân ngay để tránh biến chứng loét.`,
  },
  {
    title: 'Tư vấn GDM: Lo lắng sau xét nghiệm đường huyết thai kỳ',
    content: `[Bệnh nhân]: Tôi mang thai tuần 26, bác sĩ nói chỉ số đường sau uống nước glucose hơi cao và cần theo dõi tiểu đường thai kỳ. Tôi có làm hại con không?

[Bác sĩ]: GDM khá phổ biến và có thể quản lý tốt bằng dinh dưỡng, vận động và khi cần là insulin. Mục tiêu là giữ đường huyết trong ngưỡng an toàn cho mẹ và bé. Bạn sẽ được hướng dẫn đếm carb, ăn chia bữa và đo đường theo lịch; hãy tái khám đúng hẹn để bác sĩ điều chỉnh kế hoạch.`,
  },
  {
    title: 'Tư vấn chế độ ăn khi vừa tiểu đường vừa cao huyết áp',
    content: `[Bệnh nhân]: Tôi được chẩn đoán tăng huyết áp và tiểu đường type 2. Tôi nên ăn gì để không làm tăng cả đường huyết và huyết áp?

[Bác sĩ]: Nên ưu tiên rau xanh, đạm nạc, ngũ cốc nguyên hạt và hạn chế muối (DASH/Mediterranean có thể tham khảo). Tránh đồ uống có đường và thức ăn siêu chế biến. Chia bữa đều, theo dõi đường huyết và huyết áp tại nhà; liều thuốc chỉ điều chỉnh theo bác sĩ.`,
  },
  {
    title: 'Hội thoại: Đếm carbohydrate trong thai kỳ (GDM)',
    content: `[Bệnh nhân]: Bác sĩ bảo tôi ăn khoảng 175 g carb mỗi ngày nhưng tôi không biết chia thế nào cho ba bữa chính và bữa phụ.

[Bác sĩ]: Thông thường carb được chia đều qua các bữa để tránh tăng đường sau ăn. Một cách làm là phân bổ phần lớn vào bữa sáng/trưa/tối và giữ phần nhỏ cho bữa phụ; ghi nhật ký ăn kèm chỉ số đường 1–2 giờ sau ăn giúp điều chỉnh khẩu phần. Bạn nên làm việc với điều dưỡng dinh dưỡng để cá nhân hóa theo cân nặng và hoạt động.`,
  },
  {
    title: 'Tư vấn huyết áp cao: có cần đổi thuốc khi đang tiểu đường?',
    content: `[Bệnh nhân]: Tôi uống thuốc huyết áp và metformin. Gần đây huyết áp buổi sáng vẫn 140/90, tôi có tự tăng liều được không?

[Bác sĩ]: Không nên tự ý tăng giảm thuốc huyết áp. Một số thuốc huyết áp có lợi ở người tiểu đường (như nhóm ức chế men chuyển), nhưng lựa chọn phụ thuộc chức năng thận, kali và thuốc khác bạn đang dùng. Hãy mang sổ đo huyết áp tại nhà khi tái khám để bác sĩ quyết định.`,
  },
  {
    title: 'Hội thoại: Lo ngại tăng cân và đường huyết sau Tết',
    content: `[Bệnh nhân]: Sau Tết tôi tăng 2 kg, đường huyết lúc đói cũng nhích lên. Tôi có cần nhịn carb hoàn toàn không?

[Bác sĩ]: Không nên cắt carb đột ngột; hãy quay lại khẩu phần cân bằng: giảm đường tinh, tăng rau và đạm nạc, vận động nhẹ đều đặn. Mục tiêu giảm 5–7% cân nặng (nếu thừa cân) theo thời gian giúp cải thiện độ nhạy insulin — thảo luận với bác sĩ về mục tiêu cá nhân.`,
  },
];

async function ensureMedicalCaseCategory(
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
        'Tình huống hội thoại lâm sàng (MedDialog-style) — tiểu đường, huyết áp, dinh dưỡng, GDM.',
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
      `[Upsert] Đã có bài theo title — cập nhật: "${row.title}"`,
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
  console.log(`Seeded Medical Case: [${row.title}] successfully`);
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
    console.log('--- Seed MedDialog-style medical cases (E-12) ---\n');
    const category = await ensureMedicalCaseCategory(db);
    for (const row of ARTICLES) {
      await upsertArticleAndEmbed(db, embeddingService, category.id, row);
      console.log('');
    }
    console.log(`✅ Hoàn tất seed-med-dialog (${ARTICLES.length} bài).`);
  } finally {
    await app.close();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
