import { chatJSON } from '@/lib/openrouter';
import { getExtractionPrompt } from './prompts';
import type { RawDocument, ExtractionResult } from '@/types';

export async function extractEntities(doc: RawDocument): Promise<ExtractionResult> {
  // Trim content to avoid blowing the context window
  const content = doc.content.slice(0, 6000);

  const prompt = getExtractionPrompt({
    source: doc.source,
    docType: doc.docType,
    author: doc.author ?? 'unknown',
    channel: doc.channel ?? 'n/a',
    createdAt: doc.createdAt.toISOString(),
    content,
  });

  try {
    const result = await chatJSON<ExtractionResult>(
      // The extraction prompt IS the full system message
      prompt,
      // User turn: empty — all context is in the system prompt
      'Extract entities and relationships from the content above.',
      { temperature: 0.1, maxTokens: 4096 }
    );

    // Normalise: ensure arrays exist
    return {
      entities: Array.isArray(result.entities) ? result.entities : [],
      relationships: Array.isArray(result.relationships) ? result.relationships : [],
    };
  } catch (err) {
    console.error(`[extractor] Failed for ${doc.sourceId}:`, err);
    return { entities: [], relationships: [] };
  }
}
