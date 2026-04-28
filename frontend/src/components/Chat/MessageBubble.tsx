import React from 'react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender: 'me' | 'stranger';
  text: string;
  timestamp: number;
  type: 'text' | 'system';
}

export function MessageBubble({ message }: { message: Message }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full font-medium">
          {message.text}
        </span>
      </div>
    );
  }

  const isMe = message.sender === 'me';
  const label = isMe ? 'You' : 'Stranger';

  return (
    <div className={cn("flex w-full flex-col", isMe ? "items-end" : "items-start")}>
      <span className="text-[10px] font-bold uppercase text-gray-400 mb-1 px-2">
        {label}
      </span>
      <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[75%] p-3 rounded-2xl text-sm shadow-sm",
            isMe
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
          )}
        >
          <p className="leading-relaxed">{message.text}</p>
          <div className={cn("text-[10px] mt-1 opacity-70 text-right", isMe ? "text-blue-100" : "text-gray-400")}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
