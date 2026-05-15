'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Sparkles, ArrowRight, Loader2, Zap, CheckCircle2, AlertCircle, Globe, CreditCard } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://flow-pay-jo5r.onrender.com';

export default function MerchantPaymentModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { getAccessToken } = usePrivy();
  const [step, setStep] = useState(1); // 1: Upload, 2: Review & Quote, 3: Executing, 4: Success
  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [settlementStatus, setSettlementStatus] = useState<string>('PENDING');
  const [settlementDetail, setSettlementDetail] = useState<string>('Initializing global rails...');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError('');

    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append('bill', file);

      // 1. Scan the bill
      const scanRes = await fetch(`${API_URL}/api/bill/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!scanRes.ok) throw new Error('Scan failed. Try a clearer image.');
      const data = await scanRes.json();
      setBillData(data);

      // 2. Prepare Merchant Payment (Get Quotes)
      const prepareRes = await fetch(`${API_URL}/api/merchant/prepare`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          billData: data,
          sourceCurrency: 'USDC'
        })
      });

      if (!prepareRes.ok) throw new Error('Failed to fetch payment quotes.');
      const prepData = await prepareRes.json();
      setQuote(prepData.quote);
      setStep(2);

    } catch (err: any) {
      console.error('Merchant scan failed:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError('');

    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_URL}/api/merchant/execute`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          recipientDetails: billData.paymentDetails,
          amount: quote.cryptoAmount,
          currency: quote.cryptoCurrency,
          sourceAsset: 'USDC'
        })
      });

      const result = await response.json();
      if (result.success) {
        setTrackingId(result.trackingId);
        setSettlementStatus(result.status);
        setStep(3);
      } else {
        throw new Error(result.error || 'Execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  // Poll for status when in step 3
  useEffect(() => {
    let interval: any;
    if (step === 3 && trackingId) {
      interval = setInterval(async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch(`${API_URL}/api/merchant/track/${trackingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          setSettlementStatus(data.status);
          // showing detailed status from backend
          if (data.detail) setSettlementDetail(data.detail);
          
          if (data.status === 'COMPLETED') {
            setStep(4);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Status check failed:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, trackingId, getAccessToken]);

  const resetAndClose = () => {
    setStep(1);
    setBillData(null);
    setQuote(null);
    setTrackingId(null);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="relative w-full max-w-2xl bg-[#0A0A0B] rounded-t-[3rem] sm:rounded-[3rem] p-8 border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,245,160,0.1)]"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00F5A0]/10 rounded-full flex items-center justify-center">
                  <Globe size={20} className="text-[#00F5A0]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Global Pay</h3>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Crypto to Local Rail</p>
                </div>
              </div>
              <button onClick={resetAndClose} className="p-3 glass-card rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                {!isScanning ? (
                  <>
                    <div className="w-32 h-32 bg-[#00F5A0]/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-dashed border-[#00F5A0]/30 relative group cursor-pointer" onClick={triggerUpload}>
                      <Camera size={40} className="text-[#00F5A0] group-hover:scale-110 transition-transform" />
                      <div className="absolute -right-2 -top-2 w-8 h-8 bg-[#00F5A0] rounded-full flex items-center justify-center shadow-lg">
                        <Sparkles size={16} className="text-black" />
                      </div>
                    </div>
                    <h4 className="text-2xl font-bold mb-3">Scan any Bill or QR</h4>
                    <p className="text-white/40 mb-10 max-w-xs mx-auto text-sm leading-relaxed">
                      AI extracts merchant details and initiates an instant crypto-to-fiat conversion for any local payment rail.
                    </p>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6 flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle size={18} /> {error}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={triggerUpload}
                      className="btn-primary w-full max-w-sm mx-auto flex items-center justify-center gap-4 py-5 text-lg"
                    >
                      <Camera size={24} />
                      Scan Merchant Bill
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-10">
                    <div className="relative w-48 h-64 bg-white/5 rounded-[2rem] overflow-hidden mb-10 border border-white/10 shadow-2xl">
                      <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 h-1 bg-[#00F5A0] shadow-[0_0_30px_#00F5A0] z-10"
                      />
                      <div className="p-6 space-y-6 opacity-20">
                        <div className="h-3 w-3/4 bg-white rounded-full" />
                        <div className="h-3 w-1/2 bg-white rounded-full" />
                        <div className="h-3 w-2/3 bg-white rounded-full" />
                        <div className="h-3 w-full bg-white rounded-full" />
                        <div className="h-3 w-4/5 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[#00F5A0] font-black text-xl tracking-tight">FlowPay AI is thinking...</p>
                      <p className="text-white/30 text-sm">Detecting merchant rails and conversion rates</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Review & Quote */}
            {step === 2 && billData && quote && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="space-y-6">
                  {/* Merchant Info */}
                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Merchant</p>
                        <h5 className="text-2xl font-black tracking-tight">{billData.establishment || 'Unknown Merchant'}</h5>
                      </div>
                      <div className="bg-[#00F5A0] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        {billData.paymentDetails?.type || 'LOCAL RAIL'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                      <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Amount Due</p>
                        <p className="text-2xl font-black">{billData.currency} {billData.total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Payment ID</p>
                        <p className="text-sm font-mono text-white/60 truncate">{billData.paymentDetails?.value || 'Detected via OCR'}</p>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                      <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">You Pay (estimated)</p>
                        <p className="text-4xl font-black text-[#00F5A0]">{quote.cryptoAmount.toFixed(4)} <span className="text-lg opacity-50">{quote.cryptoCurrency}</span></p>
                      </div>
                      <div className="text-right pb-1">
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Incl. network fees</p>
                      </div>
                    </div>
                  </div>

                  {/* Trust Badge */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 text-xs">
                    <Zap size={14} />
                    <p>Powered by Sera Liquidity & Bridge.xyz Fiat Settlement</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => { setStep(1); setBillData(null); }} className="btn-secondary flex-1 py-5 rounded-3xl font-bold">
                      Discard
                    </button>
                    <button 
                      onClick={handleExecute}
                      disabled={isExecuting}
                      className="btn-primary flex-[2] flex items-center justify-center gap-3 py-5 rounded-3xl font-black shadow-[0_10px_40px_rgba(0,245,160,0.3)]"
                    >
                      {isExecuting ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                      Pay Now
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Executing */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                <div className="relative w-32 h-32 mx-auto mb-10">
                  <div className="absolute inset-0 rounded-full border-4 border-[#00F5A0]/20" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-4 border-t-[#00F5A0] border-transparent"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={40} className="text-[#00F5A0] animate-pulse" />
                  </div>
                </div>
                
                <h4 className="text-3xl font-black mb-4 tracking-tight">Settling Payment...</h4>
                <div className="space-y-4 max-w-xs mx-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Status:</span>
                    <span className="text-[#00F5A0] font-bold uppercase tracking-widest text-[10px]">{settlementStatus}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: '10%' }}
                      animate={{ 
                        width: settlementStatus === 'PENDING' ? '25%' : 
                               settlementStatus === 'CONVERTING' ? '50%' : 
                               settlementStatus === 'SETTLING' ? '85%' : '100%' 
                      }}
                      className="h-full bg-[#00F5A0] shadow-[0_0_10px_#00F5A0]"
                    />
                  </div>
                  <p className="text-[#00F5A0] text-xs font-medium min-h-[1rem]">{settlementDetail}</p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <div className="w-24 h-24 bg-[#00F5A0] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(0,245,160,0.5)]">
                  <CheckCircle2 size={48} className="text-black" />
                </div>
                <h4 className="text-4xl font-black mb-2 tracking-tight">Payment Sent!</h4>
                <p className="text-white/40 mb-10">The merchant will receive {billData.currency} {billData.total} shortly via {billData.paymentDetails?.type}.</p>
                
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-10 text-left">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/40 text-xs">Receipt ID</span>
                    <span className="font-mono text-xs">{trackingId?.slice(0, 12)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-xs">Settled On</span>
                    <span className="text-xs font-bold">Local Bank Rail (Real-time)</span>
                  </div>
                </div>

                <button onClick={resetAndClose} className="btn-primary w-full py-5 rounded-3xl font-black">
                  Done
                </button>
              </motion.div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
