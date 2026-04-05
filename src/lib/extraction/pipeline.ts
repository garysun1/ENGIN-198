import { extractEntities } from './extractor';
import { upsertNode, upsertRelationship, storeEmbedding } from '@/lib/neo4j';
import { generateEmbedding, buildEmbedText } from '@/lib/embeddings';
import type { RawDocument, PipelineResult, ExtractedEntity } from '@/types';

// ─── Node property builders ───────────────────────────────────────────────────
// Translate an extracted entity into the Neo4j property set for each label.

function buildNodeProps(
  entity: ExtractedEntity,
  doc: RawDocument
): Record<string, unknown> {
  const base = {
    name: entity.name,
    description: entity.description,
  };

  switch (entity.type) {
    case 'Person':
      return { ...base, handles: entity.handles ?? [] };

    case 'Topic':
      return base;

    case 'Decision':
      return {
        ...base,
        summary: entity.summary ?? entity.description,
        rationale: entity.rationale ?? '',
        source_url: doc.sourceUrl ?? '',
        raw_content: doc.content.slice(0, 2000),
        made_at: doc.createdAt.toISOString(),
      };

    case 'Document':
      return {
        ...base,
        title: entity.title ?? entity.name,
        doc_type: entity.doc_type ?? doc.docType,
        source: doc.source,
        source_id: doc.sourceId,
        source_url: entity.source_url ?? doc.sourceUrl ?? '',
        raw_content: doc.content.slice(0, 2000),
        created_at: doc.createdAt.toISOString(),
      };

    case 'Codebase':
      return base;

    case 'Conversation':
      return {
        ...base,
        channel: entity.channel ?? doc.channel ?? '',
        topic: entity.topic ?? '',
        source: doc.source,
        source_id: doc.sourceId,
        source_url: doc.sourceUrl ?? '',
        raw_content: doc.content.slice(0, 2000),
        started_at: doc.createdAt.toISOString(),
      };

    default:
      return base;
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function processRawDocument(doc: RawDocument): Promise<PipelineResult> {
  // 1. LLM extraction
  const extracted = await extractEntities(doc);

  if (extracted.entities.length === 0) {
    return { nodesCreated: 0, edgesCreated: 0, nodeIds: [] };
  }

  // 2. Upsert nodes
  for (const entity of extracted.entities) {
    const props = buildNodeProps(entity, doc);
    await upsertNode(entity.type, entity.id, props);
  }

  // 3. Upsert relationships (skip if either end is missing from this extraction)
  const entityIds = new Set(extracted.entities.map((e) => e.id));
  let edgesCreated = 0;

  for (const rel of extracted.relationships) {
    // Both endpoints must exist (either from this doc or earlier upserts)
    // We optimistically try the MATCH; neo4j.ts ignores if nodes aren't found
    try {
      await upsertRelationship(rel.source_id, rel.target_id, rel.type, doc.source);
      edgesCreated++;
    } catch {
      // One or both nodes not in graph yet — skip silently for demo
    }
  }

  // 4. Generate and store embeddings (skipped if OPENAI_API_KEY not set)
  for (const entity of extracted.entities) {
    try {
      const text = buildEmbedText({
        name: entity.name,
        description: entity.description,
        raw_content: entityIds.has(entity.id)
          ? (buildNodeProps(entity, doc).raw_content as string | undefined)
          : undefined,
      });
      const embedding = await generateEmbedding(text);
      if (embedding) await storeEmbedding(entity.id, embedding);
    } catch (err) {
      console.error(`[pipeline] Embedding failed for ${entity.id}:`, err);
    }
  }

  return {
    nodesCreated: extracted.entities.length,
    edgesCreated,
    nodeIds: extracted.entities.map((e) => e.id),
  };
}
