import { NextResponse } from 'next/server';
import { fetchSlackDocuments } from '@/lib/ingestion/slack';
import { processRawDocument } from '@/lib/extraction/pipeline';

export async function POST() {
  const channelIds = (process.env.SLACK_CHANNELS ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  if (channelIds.length === 0) {
    return NextResponse.json({ error: 'SLACK_CHANNELS not configured' }, { status: 400 });
  }

  const docs = await fetchSlackDocuments(channelIds);
  let nodesCreated = 0;
  let edgesCreated = 0;

  for (const doc of docs) {
    const result = await processRawDocument(doc);
    nodesCreated += result.nodesCreated;
    edgesCreated += result.edgesCreated;
  }

  return NextResponse.json({ docsProcessed: docs.length, nodesCreated, edgesCreated });
}
