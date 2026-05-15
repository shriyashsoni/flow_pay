import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { seraService } from '../services/seraService';

export class WalletController {
  static async getBalance(req: any, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (user?.privyWalletAddress) {
        const response = await seraService.getBalances(user.privyWalletAddress);
        // Map Sera balances to our format
        const usdcBalance = response.balances?.find((b: any) => b.symbol === 'USDC' || b.symbol === 'USDT')?.wallet_balance || '0';
        // Need to parse uint256 correctly, assuming 6 decimals for USDC
        const parsedBalance = parseFloat(usdcBalance) / 1e6;
        return res.json({ balance: parsedBalance, currency: 'USDC' });
      }

      res.json({ balance: 0.00, currency: 'USDC' });
    } catch (error: any) {
      console.error('Balance Error:', error);
      res.status(500).json({ error: 'Failed to fetch real-time balance' });
    }
  }

  static async getTransactions(req: any, res: Response) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: req.user.id },
            { receiverId: req.user.id }
          ]
        },
        include: {
          sender: true,
          receiver: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
