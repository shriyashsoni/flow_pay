import { prisma } from '../utils/prisma';
import { seraService } from './seraService';
import { TransactionType, TransactionStatus, Visibility } from '@prisma/client';

class PaymentService {
  /**
   * Send a payment from one user to another (Social Payment)
   */
  async sendPayment(data: {
    senderId: string;
    receiverUsername: string;
    amount: number;
    currency: string;
    caption?: string;
    visibility?: Visibility;
  }) {
    const receiver = await prisma.user.findUnique({
      where: { username: data.receiverUsername },
    });

    if (!receiver) throw new Error('Receiver not found');

    // 1. Create a pending transaction in our DB
    const transaction = await prisma.transaction.create({
      data: {
        senderId: data.senderId,
        receiverId: receiver.id,
        amount: data.amount,
        currency: data.currency,
        type: TransactionType.PAYMENT,
        caption: data.caption || null,
        visibility: data.visibility || Visibility.PUBLIC,
        status: TransactionStatus.PENDING,
      },
    });

    try {
      // 2. Mock cross-border or internal logic
      // For MVP, we'll assume internal ledger for same currency.
      // In a real prod environment, all movements might route through Sera
      // using seraService.getSwapQuote() and seraService.placeSwap()
      
      const executionId = `sim_sera_${Date.now()}`;

      // 3. Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.COMPLETED,
          seraTxId: executionId,
        },
      });

      // 4. Update balances (local ledger)
      const senderWallet = await prisma.wallet.findFirst({ where: { userId: data.senderId } });
      const receiverWallet = await prisma.wallet.findFirst({ where: { userId: receiver.id } });

      if (senderWallet) {
        await prisma.wallet.update({
          where: { id: senderWallet.id },
          data: { balance: { decrement: data.amount } },
        });
      }

      if (receiverWallet) {
        await prisma.wallet.update({
          where: { id: receiverWallet.id },
          data: { balance: { increment: data.amount } },
        });
      }

      return transaction;
    } catch (error) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED },
      });
      throw error;
    }
  }

  /**
   * Get Social Feed transactions
   */
  async getSocialFeed() {
    return prisma.transaction.findMany({
      where: {
        visibility: Visibility.PUBLIC,
      },
      include: {
        sender: { select: { username: true, avatarUrl: true } },
        receiver: { select: { username: true, avatarUrl: true } },
        comments: true,
        reactions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

export const paymentService = new PaymentService();
