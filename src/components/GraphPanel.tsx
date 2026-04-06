'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GraphData, GraphNode } from '@/types';

// Color map from CLAUDE.md
const NODE_COLORS: Record<string, string> = {
  Person: '#3b82f6',
  Topic: '#22c55e',
  Decision: '#f59e0b',
  Document: '#6b7280',
  Codebase: '#a855f7',
  Conversation: '#14b8a6',
};

interface Props {
  highlightIds?: Set<string>;
  glowIds?: Set<string>;
  onNodeClick?: (node: GraphNode) => void;
}

export default function GraphPanel({ highlightIds = new Set(), glowIds = new Set(), onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [ForceGraph, setForceGraph] = useState<any>(null);
  const [filter, setFilter] = useState<Set<string>>(
    new Set(['Person', 'Topic', 'Decision', 'Document', 'Codebase', 'Conversation'])
  );

  // Lazy-load react-force-graph-2d (client-only, no SSR)
  useEffect(() => {
    import('react-force-graph-2d').then((mod) => setForceGraph(() => mod.default));
  }, []);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/graph', { cache: 'no-store' });
      const data: GraphData = await res.json();
      setGraphData(data);
    } catch {
      // swallow — will retry on next SSE update
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // SSE — re-fetch graph on new data
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onmessage = () => fetchGraph();
    return () => es.close();
  }, [fetchGraph]);

  const toggleFilter = (type: string) => {
    setFilter((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const filteredData = {
    nodes: graphData.nodes.filter((n) => filter.has(n.type)),
    links: graphData.edges
      .filter(
        (e) =>
          graphData.nodes.some((n) => n.id === e.source && filter.has(n.type)) &&
          graphData.nodes.some((n) => n.id === e.target && filter.has(n.type))
      )
      .map((e) => ({ source: e.source, target: e.target, type: e.type })),
  };

  return (
    <div className="relative flex-1 flex flex-col bg-gray-950 overflow-hidden">
      {/* Filter bar */}
      <div className="absolute top-3 left-3 z-10 flex gap-2 flex-wrap">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-opacity ${
              filter.has(type) ? 'opacity-100' : 'opacity-30'
            }`}
            style={{ backgroundColor: color + '33', border: `1px solid ${color}`, color }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Node count + refresh */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {filteredData.nodes.length} nodes · {filteredData.links.length} edges
        </span>
        <button
          onClick={fetchGraph}
          className="text-xs text-gray-500 hover:text-gray-200 px-2 py-0.5 rounded bg-gray-800/60 hover:bg-gray-700 transition-colors"
        >
          ↻
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          Loading graph...
        </div>
      )}

      {!loading && filteredData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 text-sm gap-2">
          <span>No nodes yet.</span>
          <span className="text-xs">Run a backfill or send a Slack message.</span>
        </div>
      )}

      <div ref={containerRef} className="flex-1">
        {ForceGraph && containerRef.current && (
          <ForceGraph
            graphData={filteredData}
            width={containerRef.current.clientWidth}
            height={containerRef.current.clientHeight}
            backgroundColor="#030712"
            nodeLabel={(node: any) => {
              if (node.type === 'Document' && node.raw_content) {
                const msg = node.raw_content.replace(/^Commit [a-f0-9]+:\s*/i, '').split('\n')[0];
                return `${node.name}: ${msg}`;
              }
              return `${node.type}: ${node.name}`;
            }}
            nodeColor={(node: any) =>
              highlightIds.has(node.id)
                ? '#ffffff'
                : NODE_COLORS[node.type as string] ?? '#6b7280'
            }
            nodeRelSize={5}
            nodeVal={(node: any) => (highlightIds.has(node.id) ? 3 : 1)}
            linkColor={() => '#374151'}
            linkWidth={1}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            onNodeClick={(node: any) => onNodeClick?.(node as GraphNode)}
            cooldownTicks={80}
            nodeCanvasObjectMode={() => 'before'}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
              if (!glowIds.has(node.id)) return;
              if (!isFinite(node.x) || !isFinite(node.y)) return;
              const r = 14;
              const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
              gradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
              gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
              gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = gradient;
              ctx.fill();
            }}
          />
        )}
      </div>
    </div>
  );
}
