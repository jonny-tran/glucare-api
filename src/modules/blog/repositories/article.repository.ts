import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { AdminArticleFilterDto } from '../dto/admin-article-filter.dto';
import { PatientArticleFilterDto } from '../dto/patient-article-filter.dto';

const DEFAULT_THUMBNAIL_URL =
  'https://storage.googleapis.com/glucodia-assets/default-article-thumbnail.jpg';

@Injectable()
export class ArticleRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // --- ADMIN QUERIES ---

  async findAllForAdmin(
    query: AdminArticleFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.knowledgeArticles.$inferSelect>> {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      language,
      isPublished,
      includeDeleted,
    } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (search) {
      conditions.push(ilike(schema.knowledgeArticles.title, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(schema.knowledgeArticles.categoryId, categoryId));
    }
    if (language) {
      conditions.push(eq(schema.knowledgeArticles.language, language));
    }
    if (isPublished !== undefined) {
      conditions.push(eq(schema.knowledgeArticles.isPublished, isPublished));
    }
    if (!includeDeleted) {
      conditions.push(isNull(schema.knowledgeArticles.deletedAt));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.knowledgeArticles)
      .where(whereClause);

    const data = await this.db.query.knowledgeArticles.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(schema.knowledgeArticles.createdAt)],
      with: {
        category: true,
      },
    });

    return {
      data,
      meta: {
        total: totalRecord.count,
        page,
        limit,
        lastPage: Math.ceil(totalRecord.count / limit),
      },
    };
  }

  async findByIdForAdmin(id: string) {
    return this.db.query.knowledgeArticles.findFirst({
      where: eq(schema.knowledgeArticles.id, id),
      with: {
        category: true,
      },
    });
  }

  async create(data: {
    title: string;
    content: string;
    categoryId: string;
    language: 'VI' | 'EN';
    thumbnailUrl?: string;
  }) {
    const [created] = await this.db
      .insert(schema.knowledgeArticles)
      .values({
        ...data,
        isPublished: false,
      })
      .returning();
    return created;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      categoryId: string;
      language: 'VI' | 'EN';
      thumbnailUrl: string;
    }>,
  ) {
    const [updated] = await this.db
      .update(schema.knowledgeArticles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.knowledgeArticles.id, id))
      .returning();
    return updated;
  }

  async updatePublishStatus(id: string, isPublished: boolean) {
    const [updated] = await this.db
      .update(schema.knowledgeArticles)
      .set({ isPublished, updatedAt: new Date() })
      .where(eq(schema.knowledgeArticles.id, id))
      .returning();
    return updated;
  }

  async softDelete(id: string) {
    const [deleted] = await this.db
      .update(schema.knowledgeArticles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.knowledgeArticles.id, id),
          isNull(schema.knowledgeArticles.deletedAt),
        ),
      )
      .returning();
    return deleted;
  }

  async restore(id: string) {
    const [restored] = await this.db
      .update(schema.knowledgeArticles)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(schema.knowledgeArticles.id, id))
      .returning();
    return restored;
  }

  // --- PATIENT QUERIES ---

  async findAllForPatient(
    query: PatientArticleFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.knowledgeArticles.$inferSelect>> {
    const { page = 1, limit = 10, categoryId, language } = query;
    const offset = (page - 1) * limit;

    // HARDCODE: isPublished = true AND deletedAt IS NULL
    const conditions: SQL[] = [
      eq(schema.knowledgeArticles.isPublished, true),
      isNull(schema.knowledgeArticles.deletedAt),
      eq(schema.knowledgeArticles.language, language),
    ];

    if (categoryId) {
      conditions.push(eq(schema.knowledgeArticles.categoryId, categoryId));
    }

    const whereClause = and(...conditions);

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.knowledgeArticles)
      .where(whereClause);

    const data = await this.db.query.knowledgeArticles.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(schema.knowledgeArticles.createdAt)],
      with: {
        category: true,
      },
    });

    // Map default thumbnail if null
    const mappedData = data.map((article) => ({
      ...article,
      thumbnailUrl: article.thumbnailUrl || DEFAULT_THUMBNAIL_URL,
    }));

    return {
      data: mappedData,
      meta: {
        total: totalRecord.count,
        page,
        limit,
        lastPage: Math.ceil(totalRecord.count / limit),
      },
    };
  }

  async findByIdForPatient(id: string) {
    const article = await this.db.query.knowledgeArticles.findFirst({
      where: and(
        eq(schema.knowledgeArticles.id, id),
        eq(schema.knowledgeArticles.isPublished, true),
        isNull(schema.knowledgeArticles.deletedAt),
      ),
      with: {
        category: true,
      },
    });

    if (article) {
      return {
        ...article,
        thumbnailUrl: article.thumbnailUrl || DEFAULT_THUMBNAIL_URL,
      };
    }
    return null;
  }

  async incrementViewCount(id: string) {
    await this.db
      .update(schema.knowledgeArticles)
      .set({
        viewCount: sql`${schema.knowledgeArticles.viewCount} + 1`,
      })
      .where(eq(schema.knowledgeArticles.id, id));
  }

  // --- DASHBOARD QUERIES ---

  async countPublished(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.knowledgeArticles)
      .where(
        and(
          eq(schema.knowledgeArticles.isPublished, true),
          isNull(schema.knowledgeArticles.deletedAt),
        ),
      );
    return result.count;
  }

  async countDraft(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.knowledgeArticles)
      .where(
        and(
          eq(schema.knowledgeArticles.isPublished, false),
          isNull(schema.knowledgeArticles.deletedAt),
        ),
      );
    return result.count;
  }
}
