'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage, { type Message } from './ChatMessage';
import type { QueryResponse } from '@/types';

interface Props {
  onAnswer?: (response: QueryResponse) => void;
}

export default function ChatPanel({ onAnswer }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data: QueryResponse = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data }]);
      onAnswer?.(data);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: {
            answer: 'Something went wrong. Check that Neo4j and OpenRouter are configured.',
            sources: [],
            highlightNodes: [],
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-96 flex flex-col border-l border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-gray-300">
        Ask the graph
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-8">
            Ask anything about your team — decisions, who owns what, recent PRs, active discussions.
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex gap-1 items-center pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 bg-gray-800 text-gray-100 text-sm rounded-xl px-3 py-2 outline-none placeholder-gray-600 focus:ring-1 focus:ring-gray-600 disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
