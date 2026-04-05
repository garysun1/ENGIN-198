import { chat } from '@/lib/openrouter';
import { getSynthesisPrompt } from '@/lib/extraction/prompts';
import type { RetrievedNode, QueryResponse } from '@/types';

function formatContext(nodes: RetrievedNode[]): string {
  return nodes
    .map((node, i) => {
      const lines = [
        `[${i + 1}] ${node.type}: ${node.name}`,
        `Description: ${node.description}`,
      ];
      if (node.raw_content) {
        lines.push(`Content: ${node.raw_content.slice(0, 500)}`);
      }
      if (node.source_url) {
        lines.push(`Source: ${node.source_url}`);
      }
      return lines.join('\n');
    })
    .join('\n\n---\n\n');
}

export async function synthesize(query: string, nodes: RetrievedNode[]): Promise<QueryResponse> {
  if (nodes.length === 0) {
    return {
      answer: "I don't have enough information in the knowledge graph to answer that question yet. Try running a backfill to ingest more data.",
      sources: [],
      highlightNodes: [],
    };
  }

  const context = formatContext(nodes);
  const prompt = getSynthesisPrompt({ context, query });

  const answer = await chat(prompt, query, { temperature: 0.3, maxTokens: 1024 });

  return {
    answer,
    sources: nodes.slice(0, 5).map((n) => ({
      nodeId: n.id,
      name: n.name,
      type: n.type,
      description: n.description,
      sourceUrl: n.source_url,
    })),
    highlightNodes: nodes.map((n) => n.id),
  };
}
