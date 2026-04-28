// app/chat/page.tsx - Main Chat Interface
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { useSocket } from '@/hooks/useSocket';
import { MessageBubble } from '@/components/Chat/MessageBubble';
import { TypingIndicator } from '@/components/Chat/TypingIndicator';
import { MessageInput } from '@/components/Chat/MessageInput';
import { ReportModal } from '@/components/Moderation/ReportModal';
import { MatchAnimation } from '@/components/Matching/MatchAnimation';
import { AdBanner } from '@/components/Ads/AdBanner';
import { PremiumModal } from '@/components/Premium/PremiumModal';
import confetti from 'canvas-confetti';

interface Message {
  id: string;
  sender: 'me' | 'stranger';
  text: string;
  timestamp: number;
  type: 'text' | 'system';
}

export default function ChatPage() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<'idle' | 'searching' | 'waiting' | 'matched' | 'disconnected'>('idle');
  const [onlineCount, setOnlineCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  const socket = useSocket();
  const { isPremium, isBanned } = useChat();

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Connection established
    socket.on('connect', () => {
      console.log('Connected to server');
      setMessages([]);
    });

    // Searching for match
    socket.on('searching', () => {
      setStatus('waiting');
      addSystemMessage('🔍 Looking for someone to chat with...');
    });

    // Match found - trigger animation
    socket.on('matched', () => {
      setStatus('matched');
      setShowMatch(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => setShowMatch(false), 800);
      addSystemMessage('✨ You\'ve been matched! Say hi!');
    });

    // Receive message from stranger
    socket.on('receive_msg', (data: { text: string }) => {
      addMessage(data.text, 'stranger');
    });

    // Stranger typing indicator
    socket.on('partner_typing', (isTyping: boolean) => {
      setIsTyping(isTyping);
    });

    // Stranger disconnected
    socket.on('partner_left', () => {
      setStatus('disconnected');
      addSystemMessage('❌ Stranger has disconnected.');
    });

    // Online count update
    socket.on('online_count', (count: number) => {
      setOnlineCount(count);
    });

    // System error/ban
    socket.on('sys_error', (msg: string) => {
      addSystemMessage(`⚠️ ${msg}`);
    });

    socket.on('banned', () => {
      setStatus('disconnected');
      addSystemMessage('🚫 You have been banned. Appeal at support@strangerchat.com');
    });

    return () => {
      socket.off('connect');
      socket.off('searching');
      socket.off('matched');
      socket.off('receive_msg');
      socket.off('partner_typing');
      socket.off('partner_left');
      socket.off('online_count');
      socket.off('sys_error');
      socket.off('banned');
    };
  }, [socket]);

  // Helper: Add message to chat
  const addMessage = useCallback((text: string, sender: 'me' | 'stranger') => {
    const newMessage: Message = {
      id: Math.random().toString(),
      sender,
      text,
      timestamp: Date.now(),
      type: 'text'
    };
    setMessages(prev => [...prev, newMessage]);
    scrollToBottom();
  }, [scrollToBottom]);

  // Helper: Add system message
  const addSystemMessage = useCallback((text: string) => {
    const newMessage: Message = {
      id: Math.random().toString(),
      sender: 'me',
      text,
      timestamp: Date.now(),
      type: 'system'
    };
    setMessages(prev => [...prev, newMessage]);
    scrollToBottom();
  }, [scrollToBottom]);

  // Send message handler
  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || status !== 'matched' || !socket) return;

    // Optimistic update
    addMessage(text, 'me');

    // Emit to server
    socket.emit('send_msg', text);

    // Clear input
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.style.height = '40px';
    }

    // Stop typing indicator
    socket.emit('typing', false);
  }, [status, socket, addMessage]);

  // Typing indicator handler
  const handleTyping = useCallback((isTyping: boolean) => {
    if (!socket) return;

    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing', true);

      // Auto-stop after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', false);
      }, 2000);
    } else {
      socket.emit('typing', false);
    }
  }, [socket]);

  // Start new chat
  const handleFindMatch = useCallback(() => {
    if (!socket) return;
    setMessages([]);
    setStatus('searching');
    socket.emit('find_match');
  }, [socket]);

  // Skip to next
  const handleNext = useCallback(() => {
    if (!socket) return;
    socket.emit('leave_chat');
    setMessages([]);
    setStatus('searching');
    socket.emit('find_match');
  }, [socket]);

  // Report user
  const handleReport = useCallback((reason: string) => {
    if (!socket) return;
    socket.emit('report_user', { reason });
    setShowReport(false);
  }, [socket]);

  // Render
  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">StrangerChat</h1>
          <p className="text-xs opacity-90">
            {status === 'matched' && '✅ Connected'}
            {status === 'searching' && '🔍 Searching...'}
            {status === 'disconnected' && '❌ Disconnected'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-90">👥 {onlineCount.toLocaleString()} online</span>
          {status === 'matched' && (
            <button
              onClick={() => setShowReport(true)}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm font-medium"
            >
              Report
            </button>
          )}
        </div>
      </header>

      {/* Show Match Animation */}
      {showMatch && <MatchAnimation />}

      {/* Chat Box */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {!isPremium && <AdBanner className="mb-4" />}
        
        {messages.length === 0 && status === 'searching' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <span className="text-3xl">🔄</span>
              </div>
              <p className="text-gray-600 font-medium">Finding your perfect match...</p>
              <p className="text-sm text-gray-500">Usually takes less than 2 seconds</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}
      </div>

      {/* Typing Indicator Display */}
      {isTyping && (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          Stranger is typing...
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white space-y-3">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Interests:</span>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {interests.length === 0 ? (
                    <button 
                        onClick={() => isPremium ? setInterests(['coding', 'gaming']) : setShowPremium(true)}
                        className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-dashed border-gray-300 hover:bg-gray-200 transition"
                    >
                        + Add Interests {!isPremium && '🔒'}
                    </button>
                ) : (
                    interests.map(i => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                            {i} <button onClick={() => setInterests(prev => prev.filter(x => x !== i))}>×</button>
                        </span>
                    ))
                )}
            </div>
        </div>
        <div className="flex gap-2">
          {status === 'matched' ? (
            <button
              onClick={handleNext}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFindMatch}
              disabled={status === 'searching'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              {status === 'searching' ? 'Connecting...' : status === 'waiting' ? 'Searching...' : 'New Chat'}
            </button>
          )}

          <MessageInput
            ref={inputRef}
            onSend={handleSendMessage}
            onTyping={handleTyping}
            disabled={status !== 'matched'}
          />
        </div>

        {/* Premium Info */}
        {!isPremium && status === 'matched' && (
          <p className="text-xs text-gray-500 px-4">
            Premium: unlimited sessions, video chat, priority matching
          </p>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={handleReport}
      />

      {/* Premium Modal */}
      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
      />
    </div>
  );
}
