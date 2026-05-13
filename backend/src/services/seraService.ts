import axios from 'axios';
import { config } from '../config';

const SERA_BASE = config.SERA_BASE_URL;
const SERA_AUTH = `Bearer ${config.SERA_API_KEY}:${config.SERA_API_SECRET}`;

class SeraService {
  private authHeaders() {
    return {
      'Authorization': SERA_AUTH,
      'Content-Type': 'application/json',
    };
  }

  // ── Public Endpoints (no auth needed) ──────
  async getHealth() {
    const res = await axios.get(`${SERA_BASE}/health`);
    return res.data;
  }

  async getSystemTime(): Promise<number> {
    const res = await axios.get(`${SERA_BASE}/system/time`);
    return res.data.timestamp;
  }

  async getConfig() {
    const res = await axios.get(`${SERA_BASE}/config`);
    return res.data;
  }

  async getTokens() {
    const res = await axios.get(`${SERA_BASE}/tokens`);
    return res.data;
  }

  async getMarkets() {
    const res = await axios.get(`${SERA_BASE}/markets`);
    return res.data;
  }

  async getSwapQuote(params: {
    taker: string;
    input_token: string;
    output_token: string;
    max_input_amount: string;
    deadline: number;
  }) {
    const res = await axios.post(`${SERA_BASE}/swap/quote`, params);
    return res.data;
  }

  async verifySignature(payload: any) {
    const res = await axios.post(`${SERA_BASE}/verify-signature`, payload);
    return res.data;
  }

  // ── Authenticated Endpoints (Bearer api_key:api_secret) ──────
  async getBalances(ownerAddress: string) {
    const res = await axios.get(`${SERA_BASE}/balances`, {
      params: { owner_address: ownerAddress, include_zero: false },
      headers: this.authHeaders(),
    });
    return res.data;
  }

  async getOrders() {
    const res = await axios.get(`${SERA_BASE}/orders`, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  async getOrderById(orderId: string) {
    const res = await axios.get(`${SERA_BASE}/orders/${orderId}`, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  async getFills() {
    const res = await axios.get(`${SERA_BASE}/fills`, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  async placeOrder(orderPayload: any) {
    const res = await axios.post(`${SERA_BASE}/orders`, orderPayload, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  async placeSwap(swapPayload: any) {
    const res = await axios.post(`${SERA_BASE}/swap`, swapPayload, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  // ── Transfer (ERC-20 direct transfer via Sera) ──────
  async buildTransfer(params: {
    token: string;
    from: string;
    to: string;
    amount: string;
  }) {
    const res = await axios.post(`${SERA_BASE}/transfer`, params, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  async broadcastTransfer(rawTx: string) {
    const res = await axios.post(`${SERA_BASE}/transfer/send`, { raw_tx: rawTx }, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  // ── Deposit ──────
  async buildDeposit(params: { token: string; owner: string; amount: string }) {
    const res = await axios.post(`${SERA_BASE}/deposit`, params, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  // ── Broadcast signed tx ──────
  async broadcastTx(rawTx: string) {
    const res = await axios.post(`${SERA_BASE}/tx/send`, { raw_tx: rawTx }, {
      headers: this.authHeaders(),
    });
    return res.data;
  }

  // ── API Key management ──────
  async verifyApiKey() {
    const res = await axios.post(`${SERA_BASE}/api-keys/verify`, {
      api_key: config.SERA_API_KEY,
      api_secret: config.SERA_API_SECRET,
    });
    return res.data;
  }
}

export const seraService = new SeraService();
