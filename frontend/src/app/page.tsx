'use client';
import BalanceCard from '@/components/BalanceCard';
import ActionButtons from '@/components/ActionButtons';
import TransactionItem from '@/components/TransactionItem';
import TransferModal from '@/components/TransferModal';
import BillSplitter from '@/components/BillSplitter';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Search, Bell, Home as HomeIcon, Activity, CreditCard, User, Zap } from 'lucide-react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { SERA_DOMAIN, SERA_TYPES } from '@/utils/seraEip712';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001';

export default function Home() {
  const { login, authenticated, user, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [seraKey, setSeraKey] = useState<string | null>(null);
  const [realBalance, setRealBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [prefilledPayment, setPrefilledPayment] = useState<any>(null);
  const [balanceSource, setBalanceSource] = useState('');

  // ─── Ensure user exists in DB on login ───
  const ensureUser = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const walletAddress = wallets[0]?.address || user?.wallet?.address || null;
      const email = user?.email?.address || null;

      await fetch(`${API_URL}/api/user/ensure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress, email })
      });
    } catch (err) {
      console.error('User ensure failed:', err);
    }
  }, [getAccessToken, wallets, user]);

  // ─── Fetch dashboard data ───
  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch balance
      const balRes = await fetch(`${API_URL}/api/wallet/balance`, { headers });
      const balData = await balRes.json();
      setRealBalance(balData.balance || 0);
      setBalanceSource(balData.source || '');

      // Fetch transactions
      const txRes = await fetch(`${API_URL}/api/wallet/history`, { headers });
      const txData = await txRes.json();
      setTransactions(txData.transactions || []);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    }
  }, [getAccessToken]);

  // ─── Init on auth ───
  useEffect(() => {
    if (authenticated && user) {
      ensureUser().then(() => fetchDashboardData());
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, user, ensureUser, fetchDashboardData]);

  // ─── Sera Activation (EIP-712 key creation) ───
  const activateSera = async () => {
    if (!wallets[0]) return alert('Connect wallet first!');
    setIsActivating(true);
    try {
      const wallet = wallets[0];
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();
      const walletAddress = wallet.address;
      const timestamp = Math.floor(Date.now() / 1000);

      const signature = await signer._signTypedData(
        SERA_DOMAIN,
        { ManageApiKey: SERA_TYPES.ManageApiKey },
        { owner: walletAddress, action: 'create', timestamp }
      );

      const token = await getAccessToken();
      const response = await fetch(`${API_URL}/api/sera/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Directly call Sera from backend to create key
      const res = await fetch('https://api.sera.cx/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_address: walletAddress,
          action: 'create',
          timestamp,
          signature,
          label: 'FlowPay Wallet'
        })
      });

      const data = await res.json();
      if (data.api_key) {
        setSeraKey(data.api_key);
        alert('✅ Sera Rails Activated! Your wallet is now connected to the settlement network.');
      } else {
        throw new Error(data.detail || 'Activation failed');
      }
    } catch (error: any) {
      console.error('Sera activation error:', error);
      alert(`Activation failed: ${error.message}`);
    } finally {
      setIsActivating(false);
    }
  };

  // ─── AI Command ───
  const handleAiCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;
    setIsAiLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: aiMessage })
      });
      const result = await response.json();
      if (result.type === 'PAYMENT_INTENT' && result.data) {
        setPrefilledPayment({
          recipient: result.data.recipient,
          amount: result.data.amount?.toString() || ''
        });
        setIsTransferOpen(true);
        setAiMessage('');
      }
    } catch (err) {
      console.error('AI command failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ─── Login Screen ───
  if (!authenticated) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="relative w-64 h-64 mx-auto mb-12">
            <Image
              src="/logo.png"
              alt="FlowPay Logo"
              fill
              className="object-contain drop-shadow-[0_0_70px_rgba(0,245,160,0.5)]"
            />
          </div>
          <h1 className="text-5xl font-black mb-4 tracking-tighter">FlowPay</h1>
          <p className="text-white/50 text-lg mb-12">Social payments for the AI generation. Send money like messages.</p>
          <button onClick={login} className="btn-primary w-full text-xl py-5">
            Get Started
          </button>
        </motion.div>
      </main>
    );
  }

  // ─── Dashboard ───
  return (
    <main className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="p-6 flex justify-between items-center sticky top-0 bg-black/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <Image src="/logo.png" alt="FlowPay" fill className="object-contain" />
          </div>
          <span className="text-3xl font-black tracking-tight">FlowPay</span>
        </div>
        <div className="flex gap-4">
          <button className="w-10 h-10 glass-card flex items-center justify-center rounded-full">
            <Search size={20} className="text-white/60" />
          </button>
          <button className="w-10 h-10 glass-card flex items-center justify-center rounded-full">
            <Bell size={20} className="text-white/60" />
          </button>
        </div>
      </header>

      <div className="px-6 py-4 max-w-2xl mx-auto">
        {/* Balance */}
        <BalanceCard balance={realBalance} />

        {/* Actions */}
        <div className="mt-8">
          <ActionButtons onAction={(id) => {
            if (id === 'send') setIsTransferOpen(true);
            if (id === 'bill') setIsBillOpen(true);
          }} />
        </div>

        {/* Transfer Modal */}
        <TransferModal
          isOpen={isTransferOpen}
          onClose={() => {
            setIsTransferOpen(false);
            setPrefilledPayment(null);
          }}
          prefilledRecipient={prefilledPayment?.recipient}
          prefilledAmount={prefilledPayment?.amount}
          onSuccess={fetchDashboardData}
        />

        {/* Bill Splitter */}
        <BillSplitter
          isOpen={isBillOpen}
          onClose={() => setIsBillOpen(false)}
        />

        {/* Sera Onboarding */}
        {!seraKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-[2.5rem] bg-gradient-to-br from-[#00F5A0]/20 to-blue-500/10 border border-[#00F5A0]/30"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-[#00F5A0]" />
                  <span className="text-xs font-black uppercase tracking-tighter text-[#00F5A0]">Payment Rails Offline</span>
                </div>
                <h4 className="text-xl font-bold mb-1">Activate Global Settlements</h4>
                <p className="text-white/40 text-sm max-w-[200px]">Link your wallet to the Sera network for instant swaps.</p>
              </div>
              <button
                onClick={activateSera}
                disabled={isActivating}
                className="bg-[#00F5A0] text-black px-6 py-4 rounded-3xl font-black text-sm hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isActivating ? 'Signing...' : 'Activate'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Sera Connected Badge */}
        {seraKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 rounded-2xl bg-[#00F5A0]/10 border border-[#00F5A0]/30 flex items-center gap-3"
          >
            <Zap size={16} className="text-[#00F5A0]" />
            <span className="text-sm font-bold text-[#00F5A0]">Sera Payment Rails Active</span>
          </motion.div>
        )}

        {/* Activity Feed */}
        <div className="mt-12">
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-2xl font-bold">Activity Feed</h3>
            <button className="text-[#00F5A0] font-bold text-sm" onClick={fetchDashboardData}>Refresh</button>
          </div>
          {transactions.length > 0 ? (
            transactions.map((tx: any) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-white/20 mb-2">No transactions yet</p>
              <p className="text-white/10 text-sm">Send your first payment to see it here</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Command Bar */}
      <div className="fixed bottom-24 left-0 right-0 px-6 flex justify-center z-40">
        <form
          onSubmit={handleAiCommand}
          className="w-full max-w-2xl glass-card rounded-full p-2 flex items-center border border-[#00F5A0]/20 shadow-[0_10px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="w-10 h-10 bg-[#00F5A0] rounded-full flex items-center justify-center mr-3 ml-1">
            <Zap size={20} className="text-black" />
          </div>
          <input
            type="text"
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            placeholder="Try: 'Pay @alice $20 for lunch'"
            className="flex-1 bg-transparent border-none outline-none text-white font-medium placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={isAiLoading}
            className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full font-bold text-sm transition-colors disabled:opacity-50"
          >
            {isAiLoading ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md glass-card p-4 flex justify-between items-center z-50">
        <button className="text-[#00F5A0]"><HomeIcon size={28} /></button>
        <button className="text-white/40" onClick={fetchDashboardData}><Activity size={28} /></button>
        <div
          onClick={() => setIsTransferOpen(true)}
          className="w-14 h-14 bg-[#00F5A0] rounded-full flex items-center justify-center -mt-10 shadow-[0_10px_30px_rgba(0,245,160,0.4)] border-4 border-black cursor-pointer hover:scale-110 transition-transform"
        >
          <CreditCard size={24} className="text-black" />
        </div>
        <button className="text-white/40"><Bell size={28} /></button>
        <button className="text-white/40" onClick={logout}><User size={28} /></button>
      </nav>
    </main>
  );
}
