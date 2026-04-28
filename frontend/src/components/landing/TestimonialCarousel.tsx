'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const testimonials = [
  {
    id: 1,
    name: 'Sarah K.',
    role: 'Verified User',
    text: 'Met my current best friend here 3 months ago! The matching algorithm actually works. So much better than the old sites.',
    rating: 5,
    avatar: '👩'
  },
  {
    id: 2,
    name: 'James M.',
    role: 'Premium Member',
    text: 'The AI moderation is a game-changer. I can actually have normal conversations without the spam. Highly recommended!',
    rating: 5,
    avatar: '👨'
  },
  {
    id: 3,
    name: 'Elena R.',
    role: 'Top Chatter',
    text: 'Fast, fun, and anonymous. I love that I dont have to create an account. Just click and chat!',
    rating: 4,
    avatar: '👩'
  }
];

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-64 flex items-center justify-center">
      <AnimatePresence mode='wait'>
        <motion.div
          key={testimonials[index].id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center"
        >
          <div className="text-4xl mb-4">{testimonials[index].avatar}</div>
          <p className="text-gray-700 italic mb-6">"{testimonials[index].text}"</p>
          <div className="font-bold text-gray-900">{testimonials[index].name}</div>
          <div className="text-sm text-blue-600 font-medium">{testimonials[index].role}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
