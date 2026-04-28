'use client';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AdBannerProps {
  className?: string;
  type?: 'horizontal' | 'sidebar' | 'interactive';
}

export function AdBanner({ className, type = 'horizontal' }: AdBannerProps) {
  const [adContent, setAdContent] = useState<any>(null);

  useEffect(() => {
    // Mock ad fetch
    const mockAds = [
      { id: 1, title: 'Upgrade to Platinum', text: 'Get 3x more matches and ad-free experience!', icon: '🌟' },
      { id: 2, title: 'New VPN for Privacy', text: 'Stay anonymous while chatting with strangers.', icon: '🛡️' },
      { id: 3, title: 'Join our Discord', text: 'Meet the community beyond the chat.', icon: '💬' }
    ];
    setAdContent(mockAds[Math.floor(Math.random() * mockAds.length)]);
  }, []);

  if (!adContent) return null;

  return (
    <div className={cn(
      "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-lg p-3 flex items-center gap-4 transition-all hover:shadow-md",
      type === 'sidebar' ? "flex-col text-center" : "flex-row",
      className
    )}>
      <div className="text-3xl">{adContent.icon}</div>
      <div className="flex-1">
        <h4 className="font-bold text-sm text-blue-900">{adContent.title}</h4>
        <p className="text-xs text-blue-700">{adContent.text}</p>
      </div>
      <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">
        Learn More
      </button>
    </div>
  );
}
