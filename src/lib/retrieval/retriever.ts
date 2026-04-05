import { executeQuery } from '@/lib/neo4j';
import { generateEmbedding } from '@/lib/embeddings';
import type { RetrievedNode } from '@/types';

// ─── Vector search across all node types ─────────────────────────────────────

const VECTOR_INDEXES = [
  'topic_vec',
  'decision_vec',
  'document_vec',
  'conversation_vec',
  'person_vec',
];

async function vectorSearch(embedding: number[], k: number): Promise<RetrievedNode[]> {
  const results: RetrievedNode[] = [];

  for (const index of VECTOR_INDEXES) {
    try {
      const res = await executeQuery(
        `CALL db.index.vector.queryNodes($index, $k, $embedding)
         YIELD node, score
         RETURN node, score, labels(node)[0] AS type`,
        { index, k, embedding }
      );

      for (const record of res.records) {
        const node = record.get('node').properties;
        const score = record.get('score');
        const type = record.get('type');
        results.push({
          id: node.id,
          name: node.name ?? node.title ?? node.id,
          type,
          description: node.description ?? '',
          raw_content: node.raw_content ?? undefined,
          source_url: node.source_url ?? node.sourceUrl ?? undefined,
          score,
        });
      }
    } catch {
      // Index may not exist yet (e.g. no nodes of this type ingested) — skip
    }
  }

  return results;
}

// ─── Full-text search ─────────────────────────────────────────────────────────

async function fullTextSearch(query: string): Promise<RetrievedNode[]> {
  try {
    const res = await executeQuery(
      `CALL db.index.fulltext.queryNodes('entity_search', $query)
       YIELD node, score
       RETURN node, score, labels(node)[0] AS type
       LIMIT 10`,
      { query }
    );

    return res.records.map((record) => {
      const node = record.get('node').properties;
      const score = record.get('score');
      const type = record.get('type');
      return {
        id: node.id,
        name: node.name ?? node.title ?? node.id,
        type,
        description: node.description ?? '',
        raw_content: node.raw_content ?? undefined,
        source_url: node.source_url ?? undefined,
        score: score * 0.8, // scale down vs vector scores
      };
    });
  } catch {
    return [];
  }
}

// ─── 1-hop graph expansion ────────────────────────────────────────────────────

async function graphExpand(nodeIds: string[]): Promise<RetrievedNode[]> {
  if (nodeIds.length === 0) return [];

  const res = await executeQuery(
    `UNWIND $ids AS nodeId
     MATCH (n {id: nodeId})-[r]-(neighbor)
     RETURN neighbor, labels(neighbor)[0] AS type, type(r) AS relType
     LIMIT 40`,
    { ids: nodeIds }
  );

  return res.records.map((record) => {
    const node = record.get('neighbor').properties;
    const type = record.get('type');
    return {
      id: node.id,
      name: node.name ?? node.title ?? node.id,
      type,
      description: node.description ?? '',
      raw_content: node.raw_content ?? undefined,
      source_url: node.source_url ?? undefined,
      score: 0.5, // expanded nodes get a lower base score
    };
  });
}

// ─── Merge + deduplicate ──────────────────────────────────────────────────────

function mergeAndRank(lists: RetrievedNode[][]): RetrievedNode[] {
  const seen = new Map<string, RetrievedNode>();

  for (const list of lists) {
    for (const node of list) {
      const existing = seen.get(node.id);
      if (!existing || node.score > existing.score) {
        seen.set(node.id, node);
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function retrieve(query: string, topK = 10): Promise<RetrievedNode[]> {
  const embedding = await generateEmbedding(query);

  const [vectorResults, textResults] = await Promise.all([
    embedding ? vectorSearch(embedding, topK) : Promise.resolve([]),
    fullTextSearch(query),
  ]);

  // Expand top 5 vector hits
  const topIds = vectorResults
    .slice(0, 5)
    .map((n) => n.id);
  const expanded = await graphExpand(topIds);

  const ranked = mergeAndRank([vectorResults, textResults, expanded]);
  return ranked.slice(0, topK);
}
