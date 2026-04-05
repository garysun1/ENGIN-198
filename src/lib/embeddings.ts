import { getOpenRouterClient } from './openrouter';

const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

function getClient() {
  return getOpenRouterClient();
}

/**
 * Generate an embedding vector. Returns null if OPENAI_API_KEY is not set,
 * allowing the pipeline to degrade gracefully to full-text search only.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  const client = getClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
  });

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export function buildEmbedText(entity: {
  name: string;
  description: string;
  raw_content?: string;
}): string {
  const parts = [entity.name, entity.description];
  if (entity.raw_content) parts.push(entity.raw_content.slice(0, 500));
  return parts.join('\n');
}
