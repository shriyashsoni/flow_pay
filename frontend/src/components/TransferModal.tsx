'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { SERA_DOMAIN, SERA_TYPES, MAINNET_USDC } from '@/utils/seraEip712';
import { encodeStandaloneUuid } from '@/utils/seraUtils';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://flow-pay-jo5r.onrender.com';

export default function TransferModal({
  isOpen,
  onClose,
  prefilledRecipient = '',
  prefilledAmount = '',
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  prefilledRecipient?: string;
  prefilledAmount?: string;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(prefilledAmount);
  const [recipient, setRecipient] = useState(prefilledRecipient);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { wallets } = useWallets();
  const { getAccessToken } = usePrivy();

  // Sync prefilled data from AI
  useEffect(() => {
    if (prefilledAmount) setAmount(prefilledAmount);
    if (prefilledRecipient) setRecipient(prefilledRecipient);
  }, [prefilledAmount, prefilledRecipient]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setAmount('');
      setRecipient('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!wallets[0]) return alert('Connect wallet first!');
    if (!amount || parseFloat(amount) <= 0) return alert('Enter a valid amount');
    if (!recipient) return alert('Enter a recipient');

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const wallet = wallets[0];
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();

      const orderId = uuidv4();
      const uuidInt = encodeStandaloneUuid(orderId, 1);
      const expiration = Math.floor(Date.now() / 1000) + 3600;

      const orderData = {
        user: wallet.address,
        expiration,
        feeBps: 0,
        recipient: '0x0000000000000000000000000000000000000000',
        fromToken: MAINNET_USDC,
        toToken: '0x0000000000000000000000000000000000000000',
        fromAmount: (parseFloat(amount) * 1e6).toString(),
        toAmount: '0',
        initialDepositAmount: 0,
        uuid: uuidInt
      };

      // Sign EIP-712 order
      const signature = await signer._signTypedData(
        SERA_DOMAIN,
        { Order: SERA_TYPES.Order },
        orderData
      );

      // Submit to backend
      const token = await getAccessToken();
      const response = await fetch(`${API_URL}/api/payments/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderData,
          signature,
          recipientUsername: recipient.replace('@', ''),
          caption: `Paid via FlowPay`,
          visibility: 'PUBLIC'
        })
      });

      const result = await response.json();
      if (result.success) {
        setStep(3);
        onSuccess?.();
      } else {
        throw new Error(result.error || 'Payment submission failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMsg(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="relative w-full max-w-lg bg-[#0A0A0B] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 border border-white/10"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">Send Money</h3>
              <button onClick={onClose} className="p-2 glass-card rounded-full"><X size={20} /></button>
            </div>

            {/* Step 1: Enter details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block">To Username</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xl focus:border-[#00F5A0] outline-none"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2 block">Amount (USDC)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-4xl font-bold focus:border-[#00F5A0] outline-none"
                  />
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!amount || !recipient}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Confirm & Sign */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="bg-[#00F5A0]/10 p-6 rounded-3xl border border-[#00F5A0]/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/40">To</span>
                    <span className="text-lg font-bold">@{recipient.replace('@', '')}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/40">Amount</span>
                    <span className="text-xl font-bold">${amount} USDC</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40">Network</span>
                    <span className="text-[#00F5A0] font-bold">Ethereum Mainnet (Sera)</span>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-red-400 text-sm text-center">{errorMsg}</p>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="btn-primary flex-[2] flex items-center justify-center gap-3"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                    {isProcessing ? 'Signing...' : 'Confirm & Sign'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-[#00F5A0] rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_#00F5A0]">
                  <ShieldCheck size={40} className="text-black" />
                </div>
                <h4 className="text-3xl font-bold mb-2">Payment Sent!</h4>
                <p className="text-white/40 mb-2">
                  ${amount} USDC → @{recipient.replace('@', '')}
                </p>
                <p className="text-white/20 text-sm mb-10">Settled on Ethereum Mainnet via Sera Protocol</p>
                <button onClick={onClose} className="btn-secondary w-full">Back to Dashboard</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
