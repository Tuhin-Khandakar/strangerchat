'use client';
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

export function PricingTable() {
  const handleCheckout = async (priceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: 'temp_user_id' }) // TODO: Get actual user ID
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Payment failed to initialize: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Could not connect to payment server.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <Card hover className="relative flex flex-col h-full">
        <CardHeader
          title="Free"
          subtitle="Essential anonymous chat"
          action={<span className="text-2xl font-bold">$0</span>}
        />
        <CardBody className="flex-1">
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center gap-2">✅ Unlimited text chat</li>
            <li className="flex items-center gap-2">✅ AI-powered matching</li>
            <li className="flex items-center gap-2">✅ Global access</li>
            <li className="flex items-center gap-2 opacity-50">❌ Priority matching</li>
            <li className="flex items-center gap-2 opacity-50">❌ Video chat</li>
            <li className="flex items-center gap-2 opacity-50">❌ Zero ads</li>
          </ul>
        </CardBody>
        <CardFooter>
          <Button variant="outline" fullWidth onClick={() => window.location.href = '/chat'}>Start Free Now</Button>
        </CardFooter>
      </Card>

      <Card hover border={false} className="relative flex flex-col h-full ring-2 ring-blue-600 shadow-2xl">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
          Most Popular
        </div>
        <CardHeader
          title="Premium"
          subtitle="Superior chat experience"
          action={<span className="text-2xl font-bold font-blue-600">$4.99<span className="text-sm font-normal text-gray-500">/mo</span></span>}
        />
        <CardBody className="flex-1">
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-center gap-2">✅ Priority Matching (2x faster)</li>
            <li className="flex items-center gap-2">✅ HD Video & Audio Chat</li>
            <li className="flex items-center gap-2">✅ Ad-Free Experience</li>
            <li className="flex items-center gap-2">✅ Exclusive Profile Badges</li>
            <li className="flex items-center gap-2">✅ Interest-based Filtering</li>
            <li className="flex items-center gap-2">✅ 7-Day Referral Rewards</li>
          </ul>
        </CardBody>
        <CardFooter>
          <Button 
            fullWidth 
            className="bg-gradient-to-r from-blue-600 to-cyan-600"
            onClick={() => handleCheckout('price_premium_id')}
          >
            Go Premium
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
