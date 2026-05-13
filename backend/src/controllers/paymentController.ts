import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { seraService } from '../services/seraService';

export class PaymentController {
  /**
   * Submit a signed Sera Order for settlement on Sepolia
   */
  static async submitOrder(req: any, res: Response) {
    try {
      const { orderData, signature, recipientUsername, caption, visibility } = req.body;
      const senderId = req.user.id;

      // 1. Submit to Sera Network
      const seraResult = await seraService.placeOrder({
        ...orderData,
        signature
      });

      // 2. Find recipient to record social transaction
      const receiver = await prisma.user.findUnique({
        where: { username: recipientUsername }
      });

      // 3. Record in our local database
      const transaction = await prisma.transaction.create({
        data: {
          senderId,
          receiverId: receiver?.id || null,
          amount: parseFloat(orderData.fromAmount) / 1e6, // Assuming USDC 6 decimals
          currency: 'USDC',
          caption,
          visibility: visibility || 'PUBLIC',
          status: 'COMPLETED',
          seraTxId: seraResult.order_id,
          blockchainTxHash: seraResult.tx_hash
        }
      });

      res.json({ success: true, transaction });
    } catch (error: any) {
      console.error('Sera Submission Error:', error);
      res.status(500).json({ error: error.message || 'Failed to submit order to Sera' });
    }
  }
}
