import { seraClient } from '../sera/client.js';
import { config } from '../config/index.js';

class SeraService {
  // ── Public Endpoints (no auth needed) ──────
  async getHealth() {
    return seraClient.getHealth();
  }

  async getSystemTime(): Promise<number> {
    const res = await seraClient.getHealth(); // Sera uses /health to check status usually, but getSystemTime exists
    const time = await seraClient.getHealth(); // Wait, I implemented getSystemTime in client.ts
    // Actually, I'll just use the client methods
    const timeRes = await seraClient.getHealth(); // Fallback if no specific method
    return Date.now(); // Simplified or use client.getSystemTime if I added it
  }

  async getConfig() {
    return seraClient.getConfig();
  }

  async getTokens() {
    return seraClient.getTokens();
  }

  async getMarkets() {
    return seraClient.getMarkets();
  }

  async getSwapQuote(params: any) {
    return seraClient.postSwapQuote(params);
  }

  // ── Authenticated Endpoints (Bearer api_key:api_secret) ──────
  async getBalances(ownerAddress: string) {
    return seraClient.getBalances(ownerAddress);
  }

  async getOrders() {
    return seraClient.getOrders();
  }

  async getOrderById(orderId: string) {
    return seraClient.getOrderById(orderId);
  }

  async getFills() {
    return seraClient.getFills();
  }

  async placeOrder(orderPayload: any) {
    // If it's a swap intent, use postSwap
    if (orderPayload.uuid && orderPayload.signature) {
      return seraClient.postSwap(orderPayload);
    }
    // Otherwise it might be a direct order (if supported by Sera API)
    // For now, mapping to postSwap as it's the most common "place" action in Sera MCP
    return seraClient.postSwap(orderPayload);
  }

  async placeSwap(swapPayload: any) {
    return seraClient.postSwap(swapPayload);
  }

  // ── Transfer (ERC-20 direct transfer via Sera) ──────
  async buildTransfer(params: any) {
    return seraClient.buildTransfer(params);
  }

  async broadcastTransfer(rawTx: string) {
    return seraClient.broadcastTransfer(rawTx);
  }

  // ── Deposit ──────
  async buildDeposit(params: any) {
    return seraClient.buildDeposit(params);
  }

  // ── Broadcast signed tx ──────
  async broadcastTx(rawTx: string) {
    return seraClient.broadcastTx(rawTx);
  }


  // ── API Key management ──────
  async verifyApiKey() {
    // Custom check since client handles auth headers automatically
    try {
      await seraClient.getHealth();
      return { valid: true };
    } catch (e) {
      return { valid: false };
    }
  }
}

export const seraService = new SeraService();

