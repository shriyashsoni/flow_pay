import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { seraService } from '../services/seraService';

export class WalletController {
  static async getBalance(req: any, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (user?.seraApiKey && user?.seraApiSecret) {
        const balances = await seraService.getBalances(user.seraApiKey, user.seraApiSecret);
        // Map Sera balances to our format
        const usdcBalance = balances.find((b: any) => b.asset === 'USDC')?.amount || 0;
        return res.json({ balance: parseFloat(usdcBalance), currency: 'USDC' });
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
