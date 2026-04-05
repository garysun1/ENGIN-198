import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from '@/lib/retrieval/retriever';
import { synthesize } from '@/lib/retrieval/synthesizer';
import { initializeServices } from '@/lib/init';

export async function POST(req: NextRequest) {
  await initializeServices();

  const { query } = await req.json();

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const nodes = await retrieve(query);
  const response = await synthesize(query, nodes);

  return NextResponse.json(response);
}
