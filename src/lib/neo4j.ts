import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';

// ─── Driver singleton ─────────────────────────────────────────────────────────

let _driver: Driver | null = null;

function getDriver(): Driver {
  if (_driver) return _driver;

  const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER ?? 'neo4j';
  const password = process.env.NEO4J_PASSWORD ?? 'password';

  _driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  return _driver;
}

// ─── Query helper ─────────────────────────────────────────────────────────────

/**
 * Execute a parameterized Cypher query and return the raw result.
 * Never use string interpolation in queries — always pass params.
 */
export async function executeQuery(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult> {
  const driver = getDriver();
  const session: Session = driver.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

/**
 * Execute a write transaction.
 */
export async function executeWrite(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult> {
  const driver = getDriver();
  const session: Session = driver.session();
  try {
    return await session.executeWrite((tx) => tx.run(cypher, params));
  } finally {
    await session.close();
  }
}

/**
 * Get the most recent `updated_at` for nodes from a given source,
 * used by the GitHub poller to detect new content.
 */
export async function getLatestTimestamp(source: string): Promise<Date> {
  const result = await executeQuery(
    `MATCH (n)
     WHERE n.source = $source AND n.updated_at IS NOT NULL
     RETURN max(n.updated_at) AS ts`,
    { source }
  );

  const ts = result.records[0]?.get('ts');
  if (!ts) return new Date(0);

  // Neo4j DateTime → JS Date
  return ts.toStandardDate ? ts.toStandardDate() : new Date(ts.toString());
}

/**
 * Upsert a graph node. Builds a dynamic SET from the provided properties.
 * Always merges on `id`.
 */
export async function upsertNode(
  label: string,
  id: string,
  props: Record<string, unknown>
): Promise<void> {
  // Build SET clause from all provided props (excluding id)
  const setClauses = Object.keys(props)
    .map((k) => `n.${k} = $${k}`)
    .join(', ');

  await executeWrite(
    `MERGE (n:${label} {id: $id})
     SET ${setClauses}, n.updated_at = datetime()`,
    { id, ...props }
  );
}

/**
 * Upsert a relationship between two nodes (matched by id).
 * Increments weight on each update.
 */
export async function upsertRelationship(
  sourceId: string,
  targetId: string,
  type: string,
  source: string
): Promise<void> {
  await executeWrite(
    `MATCH (a {id: $sourceId}), (b {id: $targetId})
     MERGE (a)-[r:\`${type}\`]->(b)
     SET r.source = $source, r.weight = coalesce(r.weight, 0) + 1`,
    { sourceId, targetId, source }
  );
}

/**
 * Store an embedding vector on a node.
 */
export async function storeEmbedding(
  id: string,
  embedding: number[]
): Promise<void> {
  await executeWrite(
    `MATCH (n {id: $id})
     SET n.embedding = $embedding`,
    { id, embedding }
  );
}

export default { executeQuery, executeWrite, getLatestTimestamp, upsertNode, upsertRelationship, storeEmbedding };
