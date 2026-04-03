-- Chuyển embedding E-12 từ 1536 (OpenAI) sang 768 (Gemini text-embedding-004).
-- Cần chạy lại: pnpm db:embeddings

UPDATE knowledge_articles SET embedding = NULL WHERE embedding IS NOT NULL;

ALTER TABLE knowledge_articles
  ALTER COLUMN embedding TYPE vector(768);
