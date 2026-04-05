'use client';

import type { LogEntry } from '@/types';

interface Props {
  entries: LogEntry[];
  onHover: (nodeIds: string[]) => void;
  onLeave: () => void;
}

const SOURCE_ICON: Record<string, string> = {
  slack: '💬',
  github: '🐙',
  unknown: '•',
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function LogPanel({ entries, onHover, onLeave }: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 w-60 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Activity
        </span>
        <span className="text-xs text-gray-600">{entries.length}</span>
      </div>

      <div className="overflow-y-auto max-h-48">
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-600 text-center">
            No updates yet
          </p>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li
                key={entry.id}
                onMouseEnter={() => onHover(entry.nodeIds)}
                onMouseLeave={onLeave}
                className="px-3 py-2 flex items-start gap-2 hover:bg-gray-800/60 cursor-default transition-colors border-b border-gray-800 last:border-0"
              >
                <span className="text-sm mt-0.5 shrink-0">
                  {SOURCE_ICON[entry.source]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-300 font-medium">
                      +{entry.nodesCreated} node{entry.nodesCreated !== 1 ? 's' : ''}
                      {entry.edgesCreated > 0 && `, +${entry.edgesCreated} edge${entry.edgesCreated !== 1 ? 's' : ''}`}
                    </span>
                    <span className="text-xs text-gray-600 shrink-0">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {entry.source}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
