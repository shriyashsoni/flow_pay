'use client';
import { motion } from 'framer-motion';
import { CheckCircle, Heart, Star, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreatorProfile({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-black">
      {/* Banner */}
      <div className="h-48 w-full bg-gradient-to-r from-[#00F5A0]/20 to-purple-600/20 relative">
        <Link href="/" className="absolute top-6 left-6 p-3 glass-card rounded-full z-10">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <div className="px-6 -mt-16 relative">
        {/* Profile Info */}
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-black mb-4 flex items-center justify-center text-4xl font-bold">
            S
          </div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-black">Sarah Jenkins</h1>
            <CheckCircle size={20} className="text-[#00F5A0]" />
          </div>
          <p className="text-white/50 mb-8 max-w-sm">
            Digital artist and DeFi educator. Helping you navigate the future of finance.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mb-10 w-full max-w-md">
            <div>
              <p className="text-2xl font-bold">12.4k</p>
              <p className="text-white/30 text-xs uppercase font-bold">Supporters</p>
            </div>
            <div>
              <p className="text-2xl font-bold">$4.2k</p>
              <p className="text-white/30 text-xs uppercase font-bold">Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold">142</p>
              <p className="text-white/30 text-xs uppercase font-bold">Posts</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 w-full max-w-md mb-12">
            <button className="btn-primary flex-1 py-5 text-lg">Subscribe • $5/mo</button>
            <button className="btn-secondary p-5"><Heart size={24} /></button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex gap-8 border-b border-white/5 mb-8">
          <button className="pb-4 border-b-2 border-[#00F5A0] font-bold">Exclusive Feed</button>
          <button className="pb-4 text-white/40 font-bold">Public Posts</button>
        </div>

        {/* Locked Content Skeleton */}
        <div className="space-y-6">
          {[1, 2].map(i => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card h-64 overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl flex flex-col items-center justify-center">
                <Star size={40} className="text-white/20 mb-4" />
                <p className="font-bold text-white/60">Unlock with Subscription</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
