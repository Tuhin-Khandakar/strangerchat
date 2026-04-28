import Link from 'next/link';
import { PricingTable } from '@/components/landing/PricingTable';

export const metadata = {
  title: 'Pricing - StrangerChat',
  description: 'Upgrade to StrangerChat Premium for an ad-free experience, unlimited chats, and priority matching.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-8">
        <h1 className="text-4xl font-black text-gray-900">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          StrangerChat is free forever, but Premium unlocks the true potential.
        </p>
        
        {/* We can re-use the PricingTable component built earlier */}
        <PricingTable />
        
        <div className="mt-16 text-center">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
        </div>
      </div>
    </div>
  );
}
