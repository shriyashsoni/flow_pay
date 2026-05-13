'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Sparkles, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4001';

export default function BillSplitter({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { getAccessToken } = usePrivy();
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [billData, setBillData] = useState<any>(null);
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

      const response = await fetch(`${API_URL}/api/bill/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Scan failed. Try a clearer image.');
      }

      const data = await response.json();
      if (data.items || data.establishment) {
        setBillData(data);
        setStep(2);
      } else {
        throw new Error('Could not read the bill. Try again.');
      }
    } catch (err: any) {
      console.error('Scan failed:', err);
      setError(err.message || 'Failed to scan bill');
    } finally {
      setIsScanning(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setBillData(null);
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
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="relative w-full max-w-2xl bg-[#0A0A0B] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 border border-white/10 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#00F5A0]" />
                <h3 className="text-2xl font-bold">AI Bill Scanner</h3>
              </div>
              <button onClick={resetAndClose} className="p-2 glass-card rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                {!isScanning ? (
                  <>
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-white/20">
                      <Camera size={32} className="text-white/40" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">Upload your receipt</h4>
                    <p className="text-white/40 mb-6 max-w-xs mx-auto">
                      Gemini AI will extract items and prices automatically.
                    </p>

                    {error && (
                      <p className="text-red-400 text-sm mb-4">{error}</p>
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
                      className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center gap-3"
                    >
                      <Camera size={20} />
                      Take Photo or Upload
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-10">
                    <div className="relative w-40 h-56 bg-white/5 rounded-2xl overflow-hidden mb-8 border border-white/10">
                      <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 h-1 bg-[#00F5A0] shadow-[0_0_20px_#00F5A0] z-10"
                      />
                      <div className="p-4 space-y-4">
                        <div className="h-2 w-3/4 bg-white/10 rounded" />
                        <div className="h-2 w-1/2 bg-white/10 rounded" />
                        <div className="h-2 w-2/3 bg-white/10 rounded" />
                      </div>
                    </div>
                    <p className="text-[#00F5A0] font-bold animate-pulse">Gemini is reading your bill...</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Results */}
            {step === 2 && billData && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="bg-white/5 p-6 rounded-3xl mb-8 border border-white/10">
                  {billData.establishment && (
                    <h5 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
                      {billData.establishment}
                    </h5>
                  )}
                  <div className="space-y-4 mb-6">
                    {(billData.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        <span className="font-bold">${(item.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {billData.tax !== undefined && (
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center mb-2">
                      <span className="text-white/40 text-sm">Tax</span>
                      <span className="font-medium">${(billData.tax || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-black text-[#00F5A0]">
                      ${(billData.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-white/40 text-xs font-bold uppercase tracking-widest">Split with</label>
                    <button className="text-[#00F5A0] flex items-center gap-2 text-xs font-bold">
                      <UserPlus size={14} /> Add Friends
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#00F5A0] flex items-center justify-center text-black font-bold">Me</div>
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/20">+</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => { setStep(1); setBillData(null); }} className="btn-secondary flex-1">
                    Retake
                  </button>
                  <button className="btn-primary flex-[2] flex items-center justify-center gap-3">
                    Request Payment <ArrowRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
