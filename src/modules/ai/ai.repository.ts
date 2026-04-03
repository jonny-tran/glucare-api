import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  sql,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

export type KnowledgeArticleHit = {
  id: string;
  title: string;
  snippet: string;
  fullContentLength: number;
  categoryName: string | null;
  /** Cosine distance (<=>); lower is more similar. Null when using text fallback. */
  distance: number | null;
};

const SNIPPET_MAX = 1200;

function toSnippet(content: string): { text: string; fullLength: number } {
  const fullLength = content.length;
  if (fullLength <= SNIPPET_MAX) {
    return { text: content, fullLength };
  }
  return { text: `${content.slice(0, SNIPPET_MAX)}…`, fullLength };
}

@Injectable()
export class AiRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getUserContext(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        id: true,
        role: true,
        fullName: true,
      },
      with: {
        patient: {
          columns: {
            diabetesType: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
    });
  }

  async createSession(userId: string) {
    const [session] = await this.db
      .insert(schema.chatSessions)
      .values({
        userId,
        sessionType: 'AI',
        status: 'Active',
        summary: null,
        context: null,
        title: 'Cuộc trò chuyện mới',
        isDeleted: false,
      })
      .returning();

    return session;
  }

  async findSessionByIdAndUser(sessionId: string, userId: string) {
    return this.db.query.chatSessions.findFirst({
      where: and(
        eq(schema.chatSessions.id, sessionId),
        eq(schema.chatSessions.userId, userId),
        eq(schema.chatSessions.isDeleted, false),
      ),
    });
  }

  async findSessionsByUser(userId: string) {
    return this.db.query.chatSessions.findMany({
      where: and(
        eq(schema.chatSessions.userId, userId),
        eq(schema.chatSessions.isDeleted, false),
      ),
      orderBy: [desc(schema.chatSessions.updatedAt)],
      columns: {
        id: true,
        userId: true,
        sessionType: true,
        status: true,
        title: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateSession(
    sessionId: string,
    userId: string,
    data: { title: string },
  ) {
    const [updated] = await this.db
      .update(schema.chatSessions)
      .set({
        title: data.title.slice(0, 255),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.chatSessions.id, sessionId),
          eq(schema.chatSessions.userId, userId),
          eq(schema.chatSessions.isDeleted, false),
        ),
      )
      .returning();

    return updated;
  }

  async softDeleteSession(sessionId: string, userId: string) {
    const [updated] = await this.db
      .update(schema.chatSessions)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.chatSessions.id, sessionId),
          eq(schema.chatSessions.userId, userId),
          eq(schema.chatSessions.isDeleted, false),
        ),
      )
      .returning();

    return updated;
  }

  async findMessagesForSessionPaginated(
    sessionId: string,
    userId: string,
    page: number,
    limit: number,
  ) {
    const session = await this.findSessionByIdAndUser(sessionId, userId);
    if (!session) {
      return null;
    }

    const offset = (page - 1) * limit;
    const [totalRow] = await this.db
      .select({ count: count() })
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId));

    const total = Number(totalRow?.count ?? 0);

    const messages = await this.db.query.chatMessages.findMany({
      where: eq(schema.chatMessages.sessionId, sessionId),
      orderBy: [asc(schema.chatMessages.createdAt)],
      limit,
      offset,
    });

    return { session, messages, total, page, limit };
  }

  async updateSessionTitleIfDefault(
    sessionId: string,
    title: string,
    defaultTitle = 'Cuộc trò chuyện mới',
  ) {
    const row = await this.db.query.chatSessions.findFirst({
      where: and(
        eq(schema.chatSessions.id, sessionId),
        eq(schema.chatSessions.isDeleted, false),
      ),
      columns: { title: true },
    });
    if (!row || row.title !== defaultTitle) {
      return null;
    }
    const [updated] = await this.db
      .update(schema.chatSessions)
      .set({ title: title.slice(0, 255), updatedAt: new Date() })
      .where(eq(schema.chatSessions.id, sessionId))
      .returning();
    return updated;
  }

  private async touchSessionUpdatedAt(sessionId: string) {
    await this.db
      .update(schema.chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(schema.chatSessions.id, sessionId));
  }

  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const [message] = await this.db
      .insert(schema.chatMessages)
      .values({
        sessionId,
        role,
        content,
        metadata,
      })
      .returning();

    await this.touchSessionUpdatedAt(sessionId);

    return message;
  }

  async getRecentMessages(sessionId: string, limit: number = 12) {
    const messages = await this.db.query.chatMessages.findMany({
      where: eq(schema.chatMessages.sessionId, sessionId),
      orderBy: [desc(schema.chatMessages.createdAt)],
      limit,
    });

    return messages.reverse();
  }

  async getAllMessages(sessionId: string) {
    return this.db.query.chatMessages.findMany({
      where: eq(schema.chatMessages.sessionId, sessionId),
      orderBy: [asc(schema.chatMessages.createdAt)],
    });
  }

  async countMessages(sessionId: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId));

    return result.count;
  }

  async updateSessionSummary(
    sessionId: string,
    summary: string,
    contextPatch?: Record<string, unknown>,
  ) {
    const existing = await this.db.query.chatSessions.findFirst({
      where: eq(schema.chatSessions.id, sessionId),
      columns: { context: true },
    });
    const prev = (existing?.context as Record<string, unknown> | null) ?? {};
    const nextContext = contextPatch
      ? { ...prev, ...contextPatch }
      : existing?.context ?? prev;

    const [updated] = await this.db
      .update(schema.chatSessions)
      .set({
        summary,
        context: nextContext,
        updatedAt: new Date(),
      })
      .where(eq(schema.chatSessions.id, sessionId))
      .returning();

    return updated;
  }

  async mergeSessionContext(
    sessionId: string,
    patch: Record<string, unknown>,
  ) {
    const existing = await this.db.query.chatSessions.findFirst({
      where: eq(schema.chatSessions.id, sessionId),
      columns: { context: true },
    });
    const prev = (existing?.context as Record<string, unknown> | null) ?? {};
    const next = { ...prev, ...patch };

    await this.db
      .update(schema.chatSessions)
      .set({ context: next, updatedAt: new Date() })
      .where(eq(schema.chatSessions.id, sessionId));
  }

  /**
   * Semantic search over E-12 using pgvector cosine distance (<=>).
   */
  async findRelatedArticles(
    queryVector: number[],
    language: 'VI' | 'EN',
    limit: number,
  ): Promise<KnowledgeArticleHit[]> {
    const vec = `[${queryVector.join(',')}]`;
    const vecLiteral = sql.raw(`'${vec}'::vector`);

    const result = await this.db.execute(sql`
      SELECT
        ka.id,
        ka.title,
        ka.content,
        c.name AS category_name,
        (ka.embedding <=> ${vecLiteral}) AS distance
      FROM knowledge_articles ka
      LEFT JOIN categories c ON c.id = ka.category_id
      WHERE ka.is_published = true
        AND ka.deleted_at IS NULL
        AND ka.language = ${language}
        AND ka.embedding IS NOT NULL
      ORDER BY ka.embedding <=> ${vecLiteral}
      LIMIT ${limit}
    `);

    const rows = result.rows as Array<{
      id: string;
      title: string;
      content: string;
      category_name: string | null;
      distance: string | number;
    }>;

    return rows.map((row) => {
      const { text, fullLength } = toSnippet(row.content);
      const distance =
        typeof row.distance === 'string'
          ? parseFloat(row.distance)
          : Number(row.distance);
      return {
        id: row.id,
        title: row.title,
        snippet: text,
        fullContentLength: fullLength,
        categoryName: row.category_name,
        distance: Number.isFinite(distance) ? distance : null,
      };
    });
  }

  mapArticlesToFallbackHits(
    articles: Array<{
      id: string;
      title: string;
      content: string;
      category?: { name: string } | null;
    }>,
  ): KnowledgeArticleHit[] {
    return articles.map((row) => {
      const { text, fullLength } = toSnippet(row.content);
      return {
        id: row.id,
        title: row.title,
        snippet: text,
        fullContentLength: fullLength,
        categoryName: row.category?.name ?? null,
        distance: null,
      };
    });
  }

  /**
   * Fallback: title ILIKE when embeddings missing or API unavailable.
   */
  async searchKnowledgeArticles(
    query: string,
    language: 'VI' | 'EN',
    limit: number,
  ) {
    return this.db.query.knowledgeArticles.findMany({
      where: and(
        ilike(schema.knowledgeArticles.title, `%${query}%`),
        eq(schema.knowledgeArticles.language, language),
        eq(schema.knowledgeArticles.isPublished, true),
        isNull(schema.knowledgeArticles.deletedAt),
      ),
      orderBy: [desc(schema.knowledgeArticles.createdAt)],
      limit,
      columns: {
        id: true,
        title: true,
        content: true,
        language: true,
        createdAt: true,
      },
      with: {
        category: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
