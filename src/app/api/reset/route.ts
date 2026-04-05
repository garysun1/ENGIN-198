import { NextResponse } from 'next/server';
import { executeWrite } from '@/lib/neo4j';

export async function DELETE() {
  await executeWrite('MATCH (n) DETACH DELETE n');
  return NextResponse.json({ ok: true });
}
