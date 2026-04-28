import Link from 'next/link';

export const metadata = {
  title: 'Safety Guidelines - StrangerChat',
  description: 'Community guidelines and safety policies for StrangerChat.',
};

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-3xl mx-auto px-6 py-16 bg-white rounded-2xl shadow-sm border border-gray-100 mt-10 mb-20 text-gray-800">
        <h1 className="text-4xl font-black text-gray-900 mb-6 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Safety First</h1>
        <p className="text-lg text-gray-600 mb-10">We take moderation seriously. Read our rules below.</p>
        
        <div className="grid gap-6">
          <div className="flex gap-4 p-5 rounded-xl border border-red-100 bg-red-50/50">
            <span className="text-3xl">🚫</span>
            <div>
              <h3 className="font-bold text-red-900">Zero Tolerance for CSAM</h3>
              <p className="text-gray-700 text-sm mt-1">We utilize automated hashtagging and image scanning to report and immediately escalate illicit content to authorities.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-xl border border-orange-100 bg-orange-50/50">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-bold text-orange-900">No Bullying or Harassment</h3>
              <p className="text-gray-700 text-sm mt-1">Our AI Toxicity engine acts in real-time. Slurs and threats will result in an immediate hardware ban.</p>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-xl border border-blue-100 bg-blue-50/50">
            <span className="text-3xl">🛡️</span>
            <div>
              <h3 className="font-bold text-blue-900">Protect Personal Info</h3>
              <p className="text-gray-700 text-sm mt-1">Never share your real name, address, phone number, or social media handles with strangers.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 text-center space-y-4 flex flex-col items-center">
          <p className="text-gray-500 text-sm">Need to report an incident?</p>
          <Link href="/chat" className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-black transition">
             Use In-App Reporting
          </Link>
          <Link href="/" className="text-blue-600 font-medium hover:underline block pt-4">
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
