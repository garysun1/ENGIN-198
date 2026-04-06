'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import GraphPanel from '@/components/GraphPanel';
import ChatPanel from '@/components/ChatPanel';
import NodeDetail from '@/components/NodeDetail';
import StatusBar from '@/components/StatusBar';
import LogPanel from '@/components/LogPanel';
import type { GraphNode, QueryResponse, GraphUpdateEvent, LogEntry } from '@/types';

const STORAGE_KEY = 'backtrace:activity-log';
const MAX_ENTRIES = 50;

function loadEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as (Omit<LogEntry, 'timestamp'> & { timestamp: string })[];
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

function saveEntries(entries: LogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable — silently skip
  }
}

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [glowIds, setGlowIds] = useState<Set<string>>(new Set());
  const [ingestCount, setIngestCount] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [graphKey, setGraphKey] = useState(0);
  const entryCounter = useRef(0);

  // Load persisted entries on mount
  useEffect(() => {
    const saved = loadEntries();
    setLogEntries(saved);
    entryCounter.current = saved.length;
  }, []);

  // SSE — append new entries and persist
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onmessage = (event) => {
      const update: GraphUpdateEvent = JSON.parse(event.data);
      if (!update.label && update.nodesCreated === 0) return;

      const entry: LogEntry = {
        id: String(entryCounter.current++),
        timestamp: update.timestamp ? new Date(update.timestamp) : new Date(),
        nodesCreated: update.nodesCreated,
        edgesCreated: update.edgesCreated,
        nodeIds: update.nodeIds,
        source: update.source ?? 'unknown',
        label: update.label,
      };

      setLogEntries((prev) => {
        const next = [entry, ...prev].slice(0, MAX_ENTRIES);
        saveEntries(next);
        return next;
      });
      setIngestCount((c) => c + 1);
    };
    return () => es.close();
  }, []);

  const handleAnswer = useCallback((response: QueryResponse) => {
    setHighlightIds(new Set(response.highlightNodes));
    setGlowIds(new Set());
  }, []);

  const handleReset = useCallback(() => {
    setLogEntries([]);
    setHighlightIds(new Set());
    setGlowIds(new Set());
    setSelectedNode(null);
    setIngestCount(0);
    setGraphKey((k) => k + 1);
    entryCounter.current = 0;
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatusBar ingestCount={ingestCount} onReset={handleReset} />

      <div className="flex flex-1 overflow-hidden relative">
        <GraphPanel
          key={graphKey}
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
