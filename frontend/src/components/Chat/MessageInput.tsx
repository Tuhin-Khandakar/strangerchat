'use client';

import React, { forwardRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  ({ onSend, onTyping, disabled }, ref) => {
    const [text, setText] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (text.trim()) {
          onSend(text);
          setText('');
        }
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      onTyping(e.target.value.length > 0);
    };

    return (
      <div className="flex-1 flex gap-2">
        <textarea
          ref={ref}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Connecting..." : "Type a message..."}
          className="flex-1 bg-gray-100 text-gray-900 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none h-10 max-h-32 min-h-[40px] transition-all disabled:opacity-50"
          rows={1}
        />
        <Button
          onClick={() => {
            if (text.trim()) {
              onSend(text);
              setText('');
            }
          }}
          disabled={disabled || !text.trim()}
          size="sm"
          className="rounded-full w-10 h-10 p-0 flex items-center justify-center shrink-0"
        >
          <SendHorizontal size={20} />
        </Button>
      </div>
    );
  }
);

MessageInput.displayName = 'MessageInput';
