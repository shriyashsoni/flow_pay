'use client';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

export default function TransactionItem({ tx }: { tx: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-6 mb-4 hover:bg-white/[0.07] transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg">
            {tx.sender.username[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold">
              <span className="text-white">{tx.sender.username}</span>
              <span className="text-white/40 font-medium mx-2">paid</span>
              <span className="text-white">{tx.receiver.username}</span>
            </p>
            <p className="text-white/40 text-sm">{new Date(tx.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-[#00F5A0]">${tx.amount}</p>
          <p className="text-xs text-white/30 uppercase tracking-widest">{tx.currency}</p>
        </div>
      </div>

      <p className="text-white/80 mb-6 text-lg">{tx.caption || '💸 Transferred via FlowPay'}</p>

      <div className="flex items-center gap-6 pt-4 border-t border-white/5">
        <button className="flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors">
          <Heart size={18} />
          <span className="text-sm font-medium">{tx.reactions?.length || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-white/40 hover:text-[#00F5A0] transition-colors">
          <MessageCircle size={18} />
          <span className="text-sm font-medium">{tx.comments?.length || 0}</span>
        </button>
        <button className="ml-auto text-white/20 hover:text-white">
          <Share2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
