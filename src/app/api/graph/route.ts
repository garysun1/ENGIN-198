import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neo4j';
import { initializeServices } from '@/lib/init';
import type { GraphData, GraphNode, GraphEdge } from '@/types';

export async function GET() {
  await initializeServices();

  // Fetch all nodes
  const nodesResult = await executeQuery(
    `MATCH (n)
     WHERE n.id IS NOT NULL
     RETURN n, labels(n)[0] AS type
     LIMIT 500`
  );

  const nodes: GraphNode[] = nodesResult.records.map((r) => {
    const props = r.get('n').properties;
    const type = r.get('type');
    return {
      id: props.id,
      type,
      name: props.name ?? props.title ?? props.id,
      description: props.description ?? '',
      source_url: props.source_url ?? undefined,
      raw_content: props.raw_content ?? undefined,
    };
  });

  // Fetch all relationships
  const edgesResult = await executeQuery(
    `MATCH (a)-[r]->(b)
     WHERE a.id IS NOT NULL AND b.id IS NOT NULL
     RETURN a.id AS source, b.id AS target, type(r) AS type
     LIMIT 2000`
  );

  const edges: GraphEdge[] = edgesResult.records.map((r) => ({
    source: r.get('source'),
    target: r.get('target'),
    type: r.get('type'),
  }));

  return NextResponse.json({ nodes, edges } satisfies GraphData);
}
