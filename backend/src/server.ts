import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { supabase } from './utils/supabase';
import { seraService } from './services/seraService';
import { aiService } from './services/aiService';
import { MerchantPaymentController } from './controllers/merchantPaymentController';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ─────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('User').select('id').limit(1);
    
    let seraStatus = 'unchecked';
    try {
      const seraHealth = await seraService.getHealth();
      seraStatus = seraHealth.status || 'unknown';
    } catch { seraStatus = 'offline'; }

    let seraKeyValid = false;
    try {
      const verify = await seraService.verifyApiKey();
      seraKeyValid = verify.valid === true;
    } catch { seraKeyValid = false; }

    res.json({
      status: 'FlowPay Backend Running',
      sera_api: seraStatus,
      sera_key_valid: seraKeyValid,
      gemini: !!config.GEMINI_API_KEY,
      supabase: !error ? 'connected' : 'error: ' + error.message,
    });
  } catch (err: any) {
    res.json({ status: 'error', message: err.message });
  }
});

// ─────────────────────────────────────────────────
// USER: Auto-create on first login
// ─────────────────────────────────────────────────
app.post('/api/user/ensure', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { walletAddress, email } = req.body;

    const { data: existing } = await supabase
      .from('User')
      .select('*')
      .eq('id', userId)
      .single();

    if (existing) {
      if (walletAddress && !existing.privyWalletAddress) {
        const { data: updated } = await supabase
          .from('User')
          .update({ privyWalletAddress: walletAddress })
          .eq('id', userId)
          .select()
          .single();
        return res.json({ user: updated });
      }
      return res.json({ user: existing });
    }

    const username = walletAddress
      ? `user_${walletAddress.slice(2, 8).toLowerCase()}`
      : `user_${userId.slice(0, 8)}`;

    const { data: newUser, error } = await supabase
      .from('User')
      .insert({
        id: userId,
        username,
        email: email || null,
        privyWalletAddress: walletAddress || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ user: newUser });
  } catch (error: any) {
    console.error('User ensure error:', error.message);
    res.json({ user: null, error: error.message });
  }
});

// ─────────────────────────────────────────────────
// WALLET: Get balance (Sera + DB fallback)
// ─────────────────────────────────────────────────
app.get('/api/wallet/balance', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // Get user's wallet address
    const { data: user } = await supabase
      .from('User')
      .select('privyWalletAddress')
      .eq('id', userId)
      .single();

    const walletAddress = user?.privyWalletAddress;

    // Try Sera balances API
    if (walletAddress) {
      try {
        const seraData = await seraService.getBalances(walletAddress);
        // seraData = { owner_address, balances: [{token, symbol, decimals, wallet_balance, vault_available, vault_frozen, vault_total, total}] }
        
        // Find USDC balance
        const usdcBalance = seraData.balances?.find((b: any) => 
          b.symbol === 'USDC' || b.symbol === 'USDT'
        );
        
        if (usdcBalance) {
          const decimals = usdcBalance.decimals || 6;
          const totalRaw = BigInt(usdcBalance.wallet_balance || '0');
          const balance = Number(totalRaw) / Math.pow(10, decimals);
          
          return res.json({ 
            balance,
            currency: usdcBalance.symbol,
            source: 'sera',
            walletAddress,
            allBalances: seraData.balances.map((b: any) => ({
              symbol: b.symbol,
              walletBalance: Number(BigInt(b.wallet_balance || '0')) / Math.pow(10, b.decimals),
              vaultAvailable: Number(BigInt(b.vault_available || '0')) / Math.pow(10, b.decimals),
              vaultFrozen: Number(BigInt(b.vault_frozen || '0')) / Math.pow(10, b.decimals),
              total: Number(BigInt(b.wallet_balance || '0')) / Math.pow(10, b.decimals), // Note: Sera API might differ, using wallet_balance as total for now
            }))
          });
        }

        // No USDC found, but Sera works — return 0 with all balances
        return res.json({ 
          balance: 0, 
          currency: 'USDC', 
          source: 'sera',
          walletAddress,
          allBalances: seraData.balances.map((b: any) => ({
            symbol: b.symbol,
            total: Number(BigInt(b.wallet_balance || '0')) / Math.pow(10, b.decimals),
          }))
        });
      } catch (seraErr: any) {
        console.warn('Sera balance fallback:', seraErr.response?.data?.detail || seraErr.message);
      }
    }

    // Fallback: Calculate from DB transactions
    const { data: sent } = await supabase
      .from('Transaction')
      .select('amount')
      .eq('senderId', userId)
      .eq('status', 'COMPLETED');

    const { data: received } = await supabase
      .from('Transaction')
      .select('amount')
      .eq('receiverId', userId)
      .eq('status', 'COMPLETED');

    const totalSent = (sent || []).reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
    const totalReceived = (received || []).reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

    res.json({ balance: totalReceived - totalSent, currency: 'USDC', source: 'db', walletAddress });
  } catch (error: any) {
    console.error('Balance Error:', error.message);
    res.json({ balance: 0, currency: 'USDC', source: 'error' });
  }
});

// ─────────────────────────────────────────────────
// WALLET: Transaction history
// ─────────────────────────────────────────────────
app.get('/api/wallet/history', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // Try to get Sera fills first
    let seraFills: any[] = [];
    try {
      const fills = await seraService.getFills();
      seraFills = fills.fills || fills || [];
    } catch {}

    // Also get DB transactions
    const { data: dbTx, error } = await supabase
      .from('Transaction')
      .select('*')
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order('createdAt', { ascending: false })
      .limit(50);

    // Merge sera fills into a unified format
    const seraFormatted = Array.isArray(seraFills) ? seraFills.map((f: any) => ({
      id: f.fill_id || f.order_id || `sera_${Date.now()}`,
      type: 'SERA_FILL',
      amount: f.amount || f.filled_amount || 0,
      currency: f.symbol || 'USDC',
      status: f.status || 'FILLED',
      caption: `Sera ${f.side || 'trade'}: ${f.from_symbol || ''} → ${f.to_symbol || ''}`,
      createdAt: f.timestamp || f.created_at || new Date().toISOString(),
      source: 'sera',
    })) : [];

    const allTransactions = [...(dbTx || []), ...seraFormatted]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ transactions: allTransactions });
  } catch (error: any) {
    console.error('History Error:', error.message);
    res.json({ transactions: [] });
  }
});

// ─────────────────────────────────────────────────
// PAYMENTS: Send money
// ─────────────────────────────────────────────────
app.post('/api/payments/send', authMiddleware, async (req: any, res) => {
  try {
    const { orderData, signature, recipientUsername, caption, visibility } = req.body;
    const senderId = req.user.userId;

    // 1. Try Sera settlement
    let seraResult: any = {};
    try {
      seraResult = await seraService.placeOrder({ ...orderData, signature });
    } catch (seraErr: any) {
      console.warn('Sera settlement note:', seraErr.response?.data?.detail || seraErr.message);
      seraResult = { order_id: `local_${Date.now()}`, tx_hash: null };
    }

    // 2. Find recipient
    let receiverId = null;
    if (recipientUsername) {
      const { data: receiver } = await supabase
        .from('User')
        .select('id')
        .eq('username', recipientUsername)
        .single();
      receiverId = receiver?.id || null;
    }

    // 3. Record transaction
    const { data: transaction, error } = await supabase
      .from('Transaction')
      .insert({
        senderId,
        receiverId,
        amount: parseFloat(orderData.fromAmount) / 1e6,
        currency: 'USDC',
        type: 'PAYMENT',
        caption: caption || `Payment to @${recipientUsername}`,
        visibility: visibility || 'PUBLIC',
        status: 'COMPLETED',
        seraTxId: seraResult.order_id || null,
        blockchainTxHash: seraResult.tx_hash || null,
      })
      .select()
      .single();

    if (error) throw error;

    io.emit('new-transaction', transaction);
    res.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Payment Error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Payment failed' });
  }
});

// ─────────────────────────────────────────────────
// BILL SCANNING: Gemini OCR
// ─────────────────────────────────────────────────
app.post('/api/bill/scan', authMiddleware, upload.single('bill'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const billData = await aiService.parseBillImage(req.file.buffer, req.file.mimetype);
    res.json(billData);
  } catch (error: any) {
    console.error('Bill Scan Error:', error.message);
    res.status(500).json({ error: 'Failed to scan bill. Try a clearer image.' });
  }
});

// ─────────────────────────────────────────────────
// MERCHANT PAYMENTS: Crypto -> AI -> Fiat Rails
// ─────────────────────────────────────────────────
app.post('/api/merchant/prepare', authMiddleware, MerchantPaymentController.prepareMerchantPayment);
app.post('/api/merchant/execute', authMiddleware, MerchantPaymentController.executeMerchantPayment);
app.get('/api/merchant/track/:trackingId', authMiddleware, MerchantPaymentController.trackStatus);

// ─────────────────────────────────────────────────
// AI CHAT: Natural language payments
// ─────────────────────────────────────────────────
app.post('/api/ai/chat', authMiddleware, async (req: any, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const intent = await aiService.parsePaymentIntent(message);
    res.json({
      type: 'PAYMENT_INTENT',
      data: intent,
      message: `Prepared: $${intent.amount} to @${intent.recipient} for "${intent.note}"`
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ error: 'Could not parse payment intent' });
  }
});

// ─────────────────────────────────────────────────
// SERA API: Full integration routes
// ─────────────────────────────────────────────────

// Public: Health
app.get('/api/sera/health', async (_req, res) => {
  try {
    const health = await seraService.getHealth();
    res.json(health);
  } catch (error: any) {
    res.json({ status: 'offline', error: error.message });
  }
});

// Public: Config (EIP-712 domain, addresses)
app.get('/api/sera/config', async (_req, res) => {
  try {
    const seraConfig = await seraService.getConfig();
    res.json(seraConfig);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public: Supported tokens
app.get('/api/sera/tokens', async (_req, res) => {
  try {
    const tokens = await seraService.getTokens();
    res.json(tokens);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Public: Markets
app.get('/api/sera/markets', async (_req, res) => {
  try {
    const markets = await seraService.getMarkets();
    res.json(markets);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Public: Server time (for signature timestamping)
app.get('/api/sera/time', async (_req, res) => {
  try {
    const time = await seraService.getSystemTime();
    res.json({ timestamp: time });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public: Swap quote
app.post('/api/sera/quote', async (req, res) => {
  try {
    const quote = await seraService.getSwapQuote(req.body);
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Balances for a wallet
app.get('/api/sera/balances/:address', async (req, res) => {
  try {
    const balances = await seraService.getBalances(req.params.address);
    res.json(balances);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Orders
app.get('/api/sera/orders', async (_req, res) => {
  try {
    const orders = await seraService.getOrders();
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Fills
app.get('/api/sera/fills', async (_req, res) => {
  try {
    const fills = await seraService.getFills();
    res.json(fills);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Place order
app.post('/api/sera/orders', authMiddleware, async (req: any, res) => {
  try {
    const result = await seraService.placeOrder(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Place swap
app.post('/api/sera/swap', authMiddleware, async (req: any, res) => {
  try {
    const result = await seraService.placeSwap(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Build transfer
app.post('/api/sera/transfer', authMiddleware, async (req: any, res) => {
  try {
    const result = await seraService.buildTransfer(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Broadcast transfer
app.post('/api/sera/transfer/send', authMiddleware, async (req: any, res) => {
  try {
    const result = await seraService.broadcastTransfer(req.body.raw_tx);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Build deposit
app.post('/api/sera/deposit', authMiddleware, async (req: any, res) => {
  try {
    const result = await seraService.buildDeposit(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Authenticated: Broadcast signed tx 
app.post('/api/sera/tx/send', authMiddleware, async (req: any, res) => {
  try {
    const result = await seraService.broadcastTx(req.body.raw_tx);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
});

// Verify API key  
app.get('/api/sera/verify-key', async (_req, res) => {
  try {
    const result = await seraService.verifyApiKey();
    res.json(result);
  } catch (error: any) {
    res.json({ valid: false, error: error.response?.data?.detail || error.message });
  }
});

// ─────────────────────────────────────────────────
// WEBSOCKETS
// ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-room', (userId: string) => socket.join(userId));
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// ─────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`🚀 FlowPay Backend live on http://localhost:${PORT}`);
  console.log(`🔑 Sera API: ${config.SERA_API_KEY ? 'Configured' : 'MISSING'}`);
  console.log(`🧠 Gemini AI: ${config.GEMINI_API_KEY ? 'Configured' : 'MISSING'}`);
  console.log(`🗄️  Supabase: ${config.SUPABASE_URL ? 'Configured' : 'MISSING'}`);
});
