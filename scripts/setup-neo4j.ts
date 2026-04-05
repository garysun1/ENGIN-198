/**
 * scripts/setup-neo4j.ts
 * Run once to create Neo4j constraints, full-text indexes, and vector indexes.
 *
 * Usage: npx tsx scripts/setup-neo4j.ts
 */

import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const VECTOR_DIMENSIONS = 1536; // text-embedding-3-small

const SETUP_STATEMENTS = [
  // ── Uniqueness constraints ──────────────────────────────────────────────────
  `CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE`,
  `CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE`,
  `CREATE CONSTRAINT decision_id IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE`,
  `CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE`,
  `CREATE CONSTRAINT codebase_id IF NOT EXISTS FOR (c:Codebase) REQUIRE c.id IS UNIQUE`,
  `CREATE CONSTRAINT conversation_id IF NOT EXISTS FOR (c:Conversation) REQUIRE c.id IS UNIQUE`,

  // ── Full-text index ─────────────────────────────────────────────────────────
  `CREATE FULLTEXT INDEX entity_search IF NOT EXISTS
   FOR (n:Person|Topic|Decision|Document|Codebase|Conversation)
   ON EACH [n.name, n.description]`,

  // ── Vector indexes ──────────────────────────────────────────────────────────
  `CREATE VECTOR INDEX person_vec IF NOT EXISTS
   FOR (p:Person) ON (p.embedding)
   OPTIONS {indexConfig: {\`vector.dimensions\`: ${VECTOR_DIMENSIONS}, \`vector.similarity_function\`: 'cosine'}}`,

  `CREATE VECTOR INDEX topic_vec IF NOT EXISTS
   FOR (t:Topic) ON (t.embedding)
   OPTIONS {indexConfig: {\`vector.dimensions\`: ${VECTOR_DIMENSIONS}, \`vector.similarity_function\`: 'cosine'}}`,

  `CREATE VECTOR INDEX decision_vec IF NOT EXISTS
   FOR (d:Decision) ON (d.embedding)
   OPTIONS {indexConfig: {\`vector.dimensions\`: ${VECTOR_DIMENSIONS}, \`vector.similarity_function\`: 'cosine'}}`,

  `CREATE VECTOR INDEX document_vec IF NOT EXISTS
   FOR (d:Document) ON (d.embedding)
   OPTIONS {indexConfig: {\`vector.dimensions\`: ${VECTOR_DIMENSIONS}, \`vector.similarity_function\`: 'cosine'}}`,

  `CREATE VECTOR INDEX conversation_vec IF NOT EXISTS
   FOR (c:Conversation) ON (c.embedding)
   OPTIONS {indexConfig: {\`vector.dimensions\`: ${VECTOR_DIMENSIONS}, \`vector.similarity_function\`: 'cosine'}}`,
];

async function main() {
  const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER ?? 'neo4j';
  const password = process.env.NEO4J_PASSWORD ?? 'password';

  console.log(`Connecting to Neo4j at ${uri}...`);

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  try {
    await driver.verifyConnectivity();
    console.log('Connected.\n');

    const session = driver.session();
    try {
      for (const stmt of SETUP_STATEMENTS) {
        const label = stmt.trim().split('\n')[0].trim();
        process.stdout.write(`  ${label.slice(0, 70)}... `);
        await session.run(stmt);
        console.log('OK');
      }
    } finally {
      await session.close();
    }

    console.log('\nNeo4j setup complete.');
  } catch (err) {
    console.error('\nSetup failed:', err);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
