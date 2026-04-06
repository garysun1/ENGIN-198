'use client';

import type { GraphNode } from '@/types';

const NODE_COLORS: Record<string, string> = {
  Person: '#3b82f6',
  Topic: '#22c55e',
  Decision: '#f59e0b',
  Document: '#6b7280',
  Codebase: '#a855f7',
  Conversation: '#14b8a6',
};

interface Props {
  node: GraphNode | null;
  onClose: () => void;
}

export default function NodeDetail({ node, onClose }: Props) {
  if (!node) return null;

  const color = NODE_COLORS[node.type] ?? '#6b7280';

  return (
    <div className="absolute bottom-4 left-4 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${color}33`, backgroundColor: color + '11' }}
      >
        <div>
          <span className="text-xs font-medium" style={{ color }}>
            {node.type}
          </span>
          <h3 className="text-sm font-semibold text-gray-100 mt-0.5">{node.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
        {node.description && (
          <p className="text-xs text-gray-300 leading-relaxed">{node.description}</p>
        )}

        {node.type === 'Document' && node.raw_content && (
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              Commit message
            </p>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-5">
              {node.raw_content.replace(/^Commit [a-f0-9]+:\s*/i, '')}
            </p>
          </div>
        )}

        {node.type !== 'Document' && node.raw_content && (
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              Source
            </p>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-5">
              {node.raw_content.slice(0, 400)}
            </p>
          </div>
        )}

        {node.source_url && (
          <a
            href={node.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-blue-400 hover:text-blue-300 truncate"
          >
            {node.source_url}
          </a>
        )}
      </div>
    </div>
  );
}
