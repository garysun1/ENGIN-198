'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'komori:activity-log';

interface Props {
  ingestCount: number;
  onReset: () => void;
}

export default function StatusBar({ ingestCount, onReset }: Props) {
  const [live, setLive] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  const handleReset = async () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000); // auto-cancel after 3s
      return;
    }
    setConfirm(false);
    setResetting(true);
    try {
      await fetch('/api/reset', { method: 'DELETE' });
      localStorage.removeItem(STORAGE_KEY);
      onReset();
    } finally {
      setResetting(false);
    }
  };

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

      <div className="ml-auto">
        <button
          onClick={handleReset}
          disabled={resetting}
          className={`px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-40 ${
            confirm
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {resetting ? 'Resetting…' : confirm ? 'Sure?' : 'Reset graph'}
        </button>
      </div>
    </div>
  );
}
