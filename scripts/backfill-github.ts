/**
 * scripts/backfill-github.ts
 * One-time GitHub history import → extract → Neo4j.
 *
 * Usage: npx tsx scripts/backfill-github.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function main() {
  const { fetchGitHubDocuments } = await import('../src/lib/ingestion/github');
  const { processRawDocument } = await import('../src/lib/extraction/pipeline');

  const repoStr = process.env.GITHUB_REPO ?? '';
  if (!repoStr.includes('/')) {
    console.error('GITHUB_REPO must be in "owner/repo" format');
    process.exit(1);
  }

  const [owner, repo] = repoStr.split('/');
  console.log(`Fetching GitHub history for ${owner}/${repo}...`);

  const docs = await fetchGitHubDocuments(owner, repo);
  console.log(`Found ${docs.length} documents. Processing...`);

  let totalNodes = 0;
  let totalEdges = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    process.stdout.write(`  [${i + 1}/${docs.length}] ${doc.sourceId}... `);
    const result = await processRawDocument(doc);
    totalNodes += result.nodesCreated;
    totalEdges += result.edgesCreated;
    console.log(`+${result.nodesCreated} nodes, +${result.edgesCreated} edges`);
  }

  console.log(`\nDone. Total: ${totalNodes} nodes, ${totalEdges} edges.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
