'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import GraphPanel from '@/components/GraphPanel';
import ChatPanel from '@/components/ChatPanel';
import NodeDetail from '@/components/NodeDetail';
import StatusBar from '@/components/StatusBar';
import LogPanel from '@/components/LogPanel';
import type { GraphNode, QueryResponse, GraphUpdateEvent, LogEntry } from '@/types';

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [glowIds, setGlowIds] = useState<Set<string>>(new Set());
  const [ingestCount, setIngestCount] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const entryCounter = useRef(0);

  // Single SSE connection for log + status
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onmessage = (event) => {
      const update: GraphUpdateEvent = JSON.parse(event.data);
      if (update.nodesCreated === 0) return;

      const entry: LogEntry = {
        id: String(entryCounter.current++),
        timestamp: update.timestamp ? new Date(update.timestamp) : new Date(),
        nodesCreated: update.nodesCreated,
        edgesCreated: update.edgesCreated,
        nodeIds: update.nodeIds,
        source: update.source ?? 'unknown',
      };

      setLogEntries((prev) => [entry, ...prev].slice(0, 50));
      setIngestCount((c) => c + 1);
    };
    return () => es.close();
  }, []);

  const handleAnswer = useCallback((response: QueryResponse) => {
    setHighlightIds(new Set(response.highlightNodes));
    setGlowIds(new Set());
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatusBar ingestCount={ingestCount} />

      <div className="flex flex-1 overflow-hidden relative">
        <GraphPanel
          highlightIds={highlightIds}
          glowIds={glowIds}
          onNodeClick={setSelectedNode}
        />

        <LogPanel
          entries={logEntries}
          onHover={(ids) => setGlowIds(new Set(ids))}
          onLeave={() => setGlowIds(new Set())}
        />

        {selectedNode && (
          <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}

        <ChatPanel onAnswer={handleAnswer} />
      </div>
    </div>
  );
}
