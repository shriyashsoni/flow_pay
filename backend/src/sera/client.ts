import axios, { type AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import type {
  BalancesResponse,
  FxRateResponse,
  SeraConfig,
  SeraMarket,
  SeraToken,
  SwapExecuteRequest,
  SwapExecuteResponse,
  SwapQuoteRequest,
  SwapQuoteResponse,
} from './types.js';

export class SeraApiError extends Error {
  constructor(
    public status: number,
    public errorCode: string | undefined,
    message: string,
    public body: unknown,
  ) {
    super(message);
    this.name = 'SeraApiError';
  }
}

export class SeraClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.SERA_BASE_URL.replace(/\/+$/, ''),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add interceptor for authentication
    this.api.interceptors.request.use((reqConfig) => {
      if (config.SERA_API_KEY && config.SERA_API_SECRET) {
        reqConfig.headers.Authorization = `Bearer ${config.SERA_API_KEY}:${config.SERA_API_SECRET}`;
      }
      return reqConfig;
    });

    // Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const detail = error.response.data?.detail;
          let errorCode: string | undefined;
          let message: string;

          if (typeof detail === 'string') {
            message = detail;
          } else if (detail && typeof detail === 'object') {
            errorCode = detail.error_code ?? detail.error;
            message = detail.detail ?? detail.error ?? `Sera ${error.response.status} Error`;
          } else {
            message = `Sera ${error.response.status} Error`;
          }

          throw new SeraApiError(
            error.response.status,
            errorCode,
            message,
            error.response.data
          );
        }
        throw error;
      }
    );
  }

  async getTokens(): Promise<{ tokens: SeraToken[] }> {
    const res = await this.api.get('/tokens');
    return res.data;
  }

  async getMarkets(): Promise<{ markets: SeraMarket[] }> {
    const res = await this.api.get('/markets');
    return res.data;
  }

  async getConfig(): Promise<SeraConfig> {
    const res = await this.api.get('/config');
    return res.data;
  }

  async getHealth(): Promise<{ status: string; executor_id?: number | string }> {
    const res = await this.api.get('/health');
    return res.data;
  }

  async getFxRate(base: string, quote: string): Promise<FxRateResponse> {
    const res = await this.api.get('/fx/rate', {
      params: { base: base.toUpperCase(), quote: quote.toUpperCase() },
    });
    return res.data;
  }

  async postSwapQuote(req: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    const res = await this.api.post('/swap/quote', req);
    return res.data;
  }

  async postSwap(req: SwapExecuteRequest): Promise<SwapExecuteResponse> {
    const res = await this.api.post('/swap', req);
    return res.data;
  }

  async getBalances(ownerAddress: string): Promise<BalancesResponse> {
    const res = await this.api.get('/balances', {
      params: { owner_address: ownerAddress },
    });
    return res.data;
  }

  async getOrders(filters: Record<string, any> = {}): Promise<any> {
    const res = await this.api.get('/orders', { params: filters });
    return res.data;
  }

  async getOrderById(orderId: string): Promise<any> {
    const res = await this.api.get(`/orders/${orderId}`);
    return res.data;
  }

  async getFills(filters: Record<string, any> = {}): Promise<any> {
    const res = await this.api.get('/fills', { params: filters });
    return res.data;
  }

  async buildTransfer(params: {
    token: string;
    from: string;
    to: string;
    amount: string;
  }): Promise<any> {
    const res = await this.api.post('/transfer', params);
    return res.data;
  }

  async broadcastTransfer(rawTx: string): Promise<any> {
    const res = await this.api.post('/transfer/send', { raw_tx: rawTx });
    return res.data;
  }

  async buildDeposit(params: { token: string; owner: string; amount: string }): Promise<any> {
    const res = await this.api.post('/deposit', params);
    return res.data;
  }

  async broadcastTx(rawTx: string): Promise<any> {
    const res = await this.api.post('/tx/send', { raw_tx: rawTx });
    return res.data;
  }
}

export const seraClient = new SeraClient();
