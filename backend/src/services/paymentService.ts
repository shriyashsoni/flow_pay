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
        caption: data.caption,
        visibility: data.visibility || Visibility.PUBLIC,
        status: TransactionStatus.PENDING,
      },
    });

    try {
      // 2. Request a quote from Sera if it's a cross-asset or treasury move
      // For MVP, we'll assume internal ledger for same currency, Sera for cross-currency
      // In a real prod environment, all movements might route through Sera
      
      const quote = await seraService.getQuote(data.currency, data.currency, data.amount);
      const execution = await seraService.executeSwap(quote.id);

      // 3. Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.COMPLETED,
          seraTxId: execution.id,
        },
      });

      // 4. Update balances (local ledger)
      await prisma.wallet.update({
        where: { userId: data.senderId },
        data: { balance: { decrement: data.amount } },
      });

      await prisma.wallet.update({
        where: { userId: receiver.id },
        data: { balance: { increment: data.amount } },
      });

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
