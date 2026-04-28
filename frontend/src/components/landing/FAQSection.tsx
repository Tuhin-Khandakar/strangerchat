'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    q: 'is StrangerChat free to use?',
    a: 'Yes, basic text matching is 100% free with no account required.'
  },
  {
    q: 'How do you ensure user safety?',
    a: 'We use real-time AI moderation (Google Perspective API) and CSAM detection to scan every message and image. Users can also report violators instantly.'
  },
  {
    q: 'Do I need to download an app?',
    a: 'No, StrangerChat is a web-based platform that works perfectly on mobile and desktop browsers.'
  },
  {
    q: 'What are the benefits of Premium?',
    a: 'Premium users get priority matching, ad-free experience, video chat capabilities, and advanced interest filtering.'
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <div key={i} className="border-b border-gray-200">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full py-6 flex justify-between items-center text-left hover:text-blue-600 transition"
          >
            <span className="text-xl font-bold">{faq.q}</span>
            <span className="text-2xl">{openIndex === i ? '−' : '+'}</span>
          </button>
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-6 text-gray-600 leading-relaxed text-lg">
                  {faq.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
