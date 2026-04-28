import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Features - StrangerChat',
  description: 'Explore the amazing features of StrangerChat including anonymous text, video calling, and interest-based matching.',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-4xl font-black text-gray-900">Platform Features</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          We're constantly adding new features to make your anonymous chatting experience safer and more fun.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left pt-10">
          <div className="p-6 border border-gray-100 rounded-xl bg-blue-50/50">
            <h3 className="text-xl font-bold mb-3 text-blue-800">Lightning Fast</h3>
            <p className="text-gray-600">Connect with a stranger in under 2 seconds. No lag, just pure real-time WebSockets.</p>
          </div>
          <div className="p-6 border border-gray-100 rounded-xl bg-blue-50/50">
            <h3 className="text-xl font-bold mb-3 text-blue-800">100% Anonymous</h3>
            <p className="text-gray-600">No accounts needed. We don't store your chat logs, ensuring your complete privacy.</p>
          </div>
          <div className="p-6 border border-gray-100 rounded-xl bg-blue-50/50">
            <h3 className="text-xl font-bold mb-3 text-blue-800">AI Moderation</h3>
            <p className="text-gray-600">Real-time toxicity scanners keep the chats clean and ban malicious users instantly.</p>
          </div>
        </div>

        <div className="pt-10">
          <Link href="/chat">
            <Button size="lg" className="bg-blue-600 text-white rounded-xl px-10 py-4 font-bold hover:bg-blue-700">
              Try It Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
