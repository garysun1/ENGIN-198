import { NextResponse } from 'next/server';
import { fetchGitHubDocuments } from '@/lib/ingestion/github';
import { processRawDocument } from '@/lib/extraction/pipeline';

export async function POST() {
  const repoStr = process.env.GITHUB_REPO ?? '';
  if (!repoStr.includes('/')) {
    return NextResponse.json({ error: 'GITHUB_REPO not configured' }, { status: 400 });
  }

  const [owner, repo] = repoStr.split('/');
  const docs = await fetchGitHubDocuments(owner, repo);
  let nodesCreated = 0;
  let edgesCreated = 0;

  for (const doc of docs) {
    const result = await processRawDocument(doc);
    nodesCreated += result.nodesCreated;
    edgesCreated += result.edgesCreated;
  }

  return NextResponse.json({ docsProcessed: docs.length, nodesCreated, edgesCreated });
}
