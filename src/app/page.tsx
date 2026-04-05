'use client';

import { useState, useCallback } from 'react';
import GraphPanel from '@/components/GraphPanel';
import ChatPanel from '@/components/ChatPanel';
import NodeDetail from '@/components/NodeDetail';
import StatusBar from '@/components/StatusBar';
import type { GraphNode, QueryResponse } from '@/types';

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [ingestCount, setIngestCount] = useState(0);

  const handleAnswer = useCallback((response: QueryResponse) => {
    setHighlightIds(new Set(response.highlightNodes));
    setIngestCount((c) => c + 1);
  }, []);

  // SSE updates also increment the counter
  const handleUpdate = useCallback(() => {
    setIngestCount((c) => c + 1);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatusBar ingestCount={ingestCount} />

      <div className="flex flex-1 overflow-hidden relative">
        <GraphPanel
          highlightIds={highlightIds}
          onNodeClick={setSelectedNode}
        />

        <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />

        <ChatPanel onAnswer={handleAnswer} />
      </div>
    </div>
  );
}
