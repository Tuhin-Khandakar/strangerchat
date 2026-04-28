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
import { motion, AnimatePresence } from 'framer-motion';

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
  const [interestInput, setInterestInput] = useState('');
  const [mode, setMode] = useState<'standard' | 'spy_asker' | 'spy_discussant'>('standard');
  const [spyQuestion, setSpyQuestion] = useState('');
  const [isAsker, setIsAsker] = useState(false);
  
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
    socket.on('matched', (data: { commonInterests?: string[], mode?: string, question?: string, isAsker?: boolean }) => {
      setStatus('matched');
      if (data.mode === 'spy') {
        setIsAsker(!!data.isAsker);
        addSystemMessage(`🕵️ Spy Mode: ${data.question}`);
        if (data.isAsker) {
            addSystemMessage("You are the asker. You can watch the strangers discuss your question.");
        }
      }
      setShowMatch(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => setShowMatch(false), 800);

      let matchMsg = "✨ You've been matched! Say hi!";
      if (data.commonInterests && data.commonInterests.length > 0) {
        matchMsg += ` You both like: ${data.commonInterests.join(', ')}`;
      } else if (interests.length > 0) {
        matchMsg += " No common interests found, but we found someone for you!";
      }
      addSystemMessage(matchMsg);

      // Play match sound
      new Audio('/sounds/match.mp3').play().catch(() => {});
    });

    // Receive message from stranger
    socket.on('receive_msg', (data: { text: string, senderId?: string }) => {
      addMessage(data.text, 'stranger');
      // Play message sound
      new Audio('/sounds/message.mp3').play().catch(() => {});
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
  const addMessage = useCallback((text: string, sender: 'me' | 'stranger', id?: string) => {
    const newMessage: Message = {
      id: id || Math.random().toString(),
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
    socket.emit('find_match', {
        interests,
        mode,
        question: mode === 'spy_asker' ? spyQuestion : undefined
    });
  }, [socket, interests, mode, spyQuestion]);

  // Skip to next
  const handleNext = useCallback(() => {
    if (!socket) return;
    socket.emit('leave_chat');
    setMessages([]);
    setStatus('searching');
    socket.emit('find_match', {
        interests,
        mode,
        question: mode === 'spy_asker' ? spyQuestion : undefined
    });
  }, [socket, interests, mode, spyQuestion]);

  // Report user
  const handleReport = useCallback((reason: string) => {
    if (!socket) return;
    socket.emit('report_user', { reason });
    setShowReport(false);
  }, [socket]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (status === 'matched' || status === 'searching' || status === 'waiting') {
                handleNext();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleNext]);

  // Render
  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 shadow-lg flex flex-col gap-4">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">StrangerChat</h1>
          <p className="text-xs opacity-90">
            {status === 'matched' && '✅ Connected'}
            {status === 'searching' && '🔍 Searching...'}
            {status === 'disconnected' && '❌ Disconnected'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
             {onlineCount.toLocaleString()} online
          </div>
          {status === 'matched' && (
            <button
              onClick={() => setShowReport(true)}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm font-medium"
            >
              Report
            </button>
          )}
        </div>
        </div>

        {status === 'idle' && (
           <div className="flex flex-col gap-2 bg-white/10 p-3 rounded-xl border border-white/20">
              <div className="flex gap-4 items-center">
                 <span className="text-xs font-bold uppercase">Mode:</span>
                 <div className="flex gap-2">
                    <button
                       onClick={() => setMode('standard')}
                       className={`px-3 py-1 rounded-full text-xs font-bold transition ${mode === 'standard' ? "bg-white text-blue-600" : "bg-white/10 hover:bg-white/20"}`}
                    >Standard</button>
                    <button
                       onClick={() => setMode('spy_discussant')}
                       className={`px-3 py-1 rounded-full text-xs font-bold transition ${mode === 'spy_discussant' ? "bg-white text-blue-600" : "bg-white/10 hover:bg-white/20"}`}
                    >Spy Mode</button>
                    <button
                       onClick={() => setMode('spy_asker')}
                       className={`px-3 py-1 rounded-full text-xs font-bold transition ${mode === 'spy_asker' ? "bg-white text-blue-600" : "bg-white/10 hover:bg-white/20"}`}
                    >Ask Question</button>
                 </div>
              </div>
              {mode === 'spy_asker' && (
                 <input
                    type="text"
                    placeholder="Enter your question for strangers..."
                    value={spyQuestion}
                    onChange={(e) => setSpyQuestion(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:bg-white/20 transition"
                 />
              )}
           </div>
        )}
      </header>

      {/* Show Match Animation */}
      {showMatch && <MatchAnimation />}

      {/* Chat Box */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {!isPremium && <AdBanner className="mb-4" />}
        
        <AnimatePresence>
          {messages.length === 0 && status === 'searching' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto"
                >
                  <span className="text-3xl">🔄</span>
                </motion.div>
                <p className="text-gray-600 font-medium">Finding your perfect match...</p>
                <p className="text-sm text-gray-500">Usually takes less than 2 seconds</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>

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
            <span className="text-xs font-bold text-gray-400 uppercase tracking-tight shrink-0">Interests:</span>
            <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1 items-center">
                {interests.map(i => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                        {i} <button onClick={() => setInterests(prev => prev.filter(x => x !== i))} className="hover:text-blue-800">×</button>
                    </span>
                ))}
                <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = interestInput.trim().toLowerCase();
                            if (val && !interests.includes(val)) {
                                setInterests(prev => [...prev, val]);
                            }
                            setInterestInput('');
                        }
                    }}
                    placeholder={interests.length === 0 ? "Add interests (e.g. music, coding)" : "Add more..."}
                    className="text-xs outline-none bg-transparent flex-1 min-w-[120px]"
                />
            </div>
        </div>
        <div className="flex gap-2">
          {status === 'matched' || status === 'waiting' || status === 'searching' ? (
            <button
              onClick={handleNext}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition"
            >
              {status === 'matched' ? 'Next' : 'Stop'}
            </button>
          ) : (
            <button
              onClick={handleFindMatch}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              New Chat
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
