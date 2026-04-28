import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - StrangerChat',
  description: 'Privacy Policy and data handling procedures for StrangerChat.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-3xl mx-auto px-6 py-16 bg-white rounded-2xl shadow-sm border border-gray-100 mt-10 mb-20 text-gray-800">
        <h1 className="text-3xl font-black text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: April 16, 2026</p>
        
        <div className="space-y-6 prose prose-blue max-w-none">
           <section>
            <h2 className="text-xl font-bold mt-8 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              StrangerChat is designed to be anonymous. We do not require accounts or real names. We temporarily collect IP addresses and browser metadata strictly for moderation and matchmaking purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">2. Chat Logs</h2>
            <p className="text-gray-600 leading-relaxed">
              All text chats are ephemeral. We do not store chat logs on our servers after a session is closed, except in cases where a user is flagged or reported by our AI moderation systems.
            </p>
          </section>

           <section>
            <h2 className="text-xl font-bold mt-8 mb-3">3. Third Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              We use Stripe for payment processing for Premium users. We do not store your credit card information. We also use Google Perspective API for toxicity analysis.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <Link href="/" className="text-blue-600 font-medium hover:underline">
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
