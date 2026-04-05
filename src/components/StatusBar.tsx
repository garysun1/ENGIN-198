'use client';

import { useEffect, useState } from 'react';

interface Props {
  ingestCount: number;
}

export default function StatusBar({ ingestCount }: Props) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 bg-gray-950 text-xs text-gray-500">
      <span className="font-semibold text-gray-200 text-sm">Kōmori</span>

      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}
        />
        <span>{live ? 'Live' : 'Connecting...'}</span>
      </div>

      {ingestCount > 0 && (
        <span className="text-gray-400">
          {ingestCount} update{ingestCount !== 1 ? 's' : ''} received
        </span>
      )}
    </div>
  );
}
