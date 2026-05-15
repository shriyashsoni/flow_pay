'use client';
import { motion } from 'framer-motion';
import { Send, Download, RefreshCw, MessageSquare, Globe } from 'lucide-react';

const actions = [
  { icon: Send, label: 'Send', id: 'send' },
  { icon: Globe, label: 'Pay Merchant', id: 'merchant', color: 'bg-blue-600', textColor: 'text-white' },
  { icon: RefreshCw, label: 'Bill Split', id: 'bill' },
  { icon: MessageSquare, label: 'AI Chat', id: 'chat', color: 'bg-[#00F5A0]', textColor: 'text-black' },
];

export default function ActionButtons({ onAction }: { onAction: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-4 w-full">
      {actions.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.id)}
          className={`${action.color || 'bg-white/10'} ${action.textColor || 'text-white'} p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-colors hover:bg-white/20`}
        >
          <action.icon size={24} />
          <span className="text-xs font-bold uppercase tracking-wider">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
