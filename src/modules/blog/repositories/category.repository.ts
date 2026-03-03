import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  SQL,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { CategoryFilterDto } from '../dto/category-filter.dto';

@Injectable()
export class CategoryRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(
    query: CategoryFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.categories.$inferSelect>> {
    const { page = 1, limit = 10, search, includeDeleted } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (search) {
      conditions.push(ilike(schema.categories.name, `%${search}%`));
    }
    if (!includeDeleted) {
      conditions.push(isNull(schema.categories.deletedAt));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.categories)
      .where(whereClause);

    const data = await this.db
      .select()
      .from(schema.categories)
      .where(whereClause)
      .orderBy(desc(schema.categories.createdAt))
      .limit(limit)
      .offset(offset);

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

  async findById(id: string) {
    const [category] = await this.db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id));
    return category || null;
  }

  async findByName(name: string) {
    const [category] = await this.db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.name, name));
    return category || null;
  }

  async create(data: { name: string; description?: string }) {
    const [created] = await this.db
      .insert(schema.categories)
      .values(data)
      .returning();
    return created;
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const [updated] = await this.db
      .update(schema.categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.categories.id, id))
      .returning();
    return updated;
  }

  async softDelete(id: string) {
    const [deleted] = await this.db
      .update(schema.categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(schema.categories.id, id), isNull(schema.categories.deletedAt)),
      )
      .returning();
    return deleted;
  }

  async restore(id: string) {
    const [restored] = await this.db
      .update(schema.categories)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.categories.id, id),
          isNotNull(schema.categories.deletedAt),
        ),
      )
      .returning();
    return restored;
  }

  async countArticlesByCategoryId(categoryId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.knowledgeArticles)
      .where(
        and(
          eq(schema.knowledgeArticles.categoryId, categoryId),
          isNull(schema.knowledgeArticles.deletedAt),
        ),
      );
    return result.count;
  }
}
