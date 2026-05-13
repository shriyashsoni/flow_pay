'use client';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function BalanceCard({ balance = 2540.50, currency = 'USDC' }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 w-full relative overflow-hidden group"
    >
      {/* Decorative Glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#00F5A0] opacity-10 blur-[100px] group-hover:opacity-20 transition-opacity" />
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-white/50 text-sm font-medium mb-1">Total Balance</p>
          <h2 className="text-5xl font-bold tracking-tight">
            <span className="text-white/40 text-3xl mr-1">$</span>
            {balance.toLocaleString()}
          </h2>
        </div>
        <div className="bg-[#00F5A0]/10 p-3 rounded-2xl">
          <Wallet className="text-[#00F5A0]" size={24} />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-xl border border-white/5">
          <TrendingUp size={16} className="text-[#00F5A0]" />
          <span className="text-sm font-medium text-[#00F5A0]">+2.4%</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-xl border border-white/5">
          <span className="text-sm font-medium text-white/60">{currency} Wallet</span>
        </div>
      </div>
    </motion.div>
  );
}
