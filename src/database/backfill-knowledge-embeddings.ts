/**
 * One-off / cron: backfill knowledge_articles.embedding cho RAG (Gemini embedding + pgvector 768).
 * Requires: DATABASE_URL, GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY).
 *
 * Run: pnpm db:embeddings
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { KNOWLEDGE_EMBEDDING_DIMENSION } from './schema';
import * as schema from './schema';

/** @see EmbeddingService — text-embedding-004 thường 404; mặc định gemini-embedding-001 */
const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
const EMBEDDING_API_VERSION =
  process.env.GEMINI_EMBEDDING_API_VERSION?.trim() || 'v1beta';
const MAX_INPUT_CHARS = 8000;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      'GEMINI_API_KEY (hoặc GOOGLE_GENERATIVE_AI_API_KEY) is required',
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: true,
    max: 5,
  });
  const db = drizzle(pool, { schema });
  const ai = new GoogleGenAI({ apiKey, apiVersion: EMBEDDING_API_VERSION });

  const articles = await db.query.knowledgeArticles.findMany({
    where: isNull(schema.knowledgeArticles.deletedAt),
    columns: {
      id: true,
      title: true,
      content: true,
    },
  });

  console.log(`Found ${articles.length} articles to embed.`);

  for (const article of articles) {
    const input = `${article.title}\n\n${article.content}`.slice(0, MAX_INPUT_CHARS);
    try {
      const res = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: input,
        config: {
          taskType: 'RETRIEVAL_DOCUMENT',
          title: article.title,
          outputDimensionality: KNOWLEDGE_EMBEDDING_DIMENSION,
        },
      });
      const embedding = res.embeddings?.[0]?.values;
      if (!embedding || embedding.length !== KNOWLEDGE_EMBEDDING_DIMENSION) {
        console.warn(
          `Skip ${article.id}: invalid embedding (len=${embedding?.length ?? 0}, expected ${KNOWLEDGE_EMBEDDING_DIMENSION})`,
        );
        continue;
      }
      const literal = `[${embedding.join(',')}]`;
      await db.execute(sql`
        UPDATE knowledge_articles
        SET
          embedding = ${sql.raw(`'${literal}'::vector`)},
          updated_at = NOW()
        WHERE id = ${article.id}
      `);
      console.log(`Embedded ${article.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[backfill] embedContent failed id=${article.id} model=${EMBEDDING_MODEL} apiVersion=${EMBEDDING_API_VERSION}: ${msg}`,
      );
    }
  }

  await pool.end();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
