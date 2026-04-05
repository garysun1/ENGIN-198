import { getOpenRouterClient } from './openrouter';

// OpenRouter proxies text-embedding-3-small from OpenAI
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export { EMBEDDING_DIMENSIONS };

/**
 * Generate an embedding vector for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenRouterClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // guard against token limit
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in one API call.
 * Falls back to sequential calls if batch fails.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenRouterClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
  });

  // Preserve order — OpenRouter returns them indexed
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Build a short text string to embed for a given entity.
 * Combines name + description (+ raw_content if available) for richer retrieval.
 */
export function buildEmbedText(entity: {
  name: string;
  description: string;
  raw_content?: string;
}): string {
  const parts = [entity.name, entity.description];
  if (entity.raw_content) parts.push(entity.raw_content.slice(0, 500));
  return parts.join('\n');
}
