'use client';

import type { QueryResponse } from '@/types';

interface UserMessage {
  role: 'user';
  content: string;
}

interface AssistantMessage {
  role: 'assistant';
  content: QueryResponse;
}

export type Message = UserMessage | AssistantMessage;

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const { answer, sources } = message.content;

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[90%] bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {answer}
      </div>

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {sources.map((s) => (
            <a
              key={s.nodeId}
              href={s.sourceUrl ?? '#'}
              target={s.sourceUrl ? '_blank' : undefined}
              rel="noopener noreferrer"
              title={s.description}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              {s.type}: {s.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
