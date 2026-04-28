'use client';
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const handleCheckout = async (priceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: 'temp_user_id' })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unlock Premium Features">
      <div className="space-y-6 p-2">
        <p className="text-gray-600 text-center">
          Take your chatting experience to the next level with StrangerChat Gold.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <Card className="p-4 border-2 border-blue-600 ring-4 ring-blue-50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">StrangerChat Gold</h3>
                <p className="text-xs text-gray-500">The ultimate experience</p>
              </div>
              <span className="text-xl font-bold text-blue-600">$4.99/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li>🚀 Priority matching (Skip the queue)</li>
              <li>🎬 HD Video chat enabled</li>
              <li>🛡️ Interest-based matching</li>
              <li>✨ Golden profile badge</li>
              <li>🚫 Zero advertisements</li>
            </ul>
            <Button 
                fullWidth 
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold"
                onClick={() => handleCheckout('price_premium_id')}
            >
              Get Gold Now
            </Button>
          </Card>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Secure payment via Stripe. Cancel anytime.
        </p>
      </div>
    </Modal>
  );
}
