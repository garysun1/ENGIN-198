/**
 * scripts/backfill-slack.ts
 * One-time Slack history import → extract → Neo4j.
 *
 * Usage: npx tsx scripts/backfill-slack.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

// Dynamic imports AFTER env is loaded
async function main() {
  const { fetchSlackDocuments } = await import('../src/lib/ingestion/slack');
  const { processRawDocument } = await import('../src/lib/extraction/pipeline');

  const channelIds = (process.env.SLACK_CHANNELS ?? '').split(',').map((c) => c.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    console.error('No SLACK_CHANNELS set in .env.local');
    process.exit(1);
  }

  console.log(`Fetching Slack history for channels: ${channelIds.join(', ')}`);
  const docs = await fetchSlackDocuments(channelIds);
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
