import type { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { seraService } from '../services/seraService';
import { offrampService, OfframpStatus } from '../services/offrampService';
import { supabase } from '../utils/supabase';

export class MerchantPaymentController {
  /**
   * Complete flow: AI Extract -> Get Quotes -> Prepare Orchestration
   */
  static async prepareMerchantPayment(req: any, res: Response) {
    try {
      const { billData, sourceCurrency } = req.body;
      const userId = req.user.userId;

      if (!billData || !billData.total || !billData.currency) {
        return res.status(400).json({ error: 'Incomplete bill data' });
      }

      // 1. Get Off-ramp Quote (Fiat needed -> Crypto to send)
      const offrampQuote = await offrampService.getQuote({
        cryptoCurrency: sourceCurrency || 'USDC',
        fiatAmount: billData.total,
        fiatCurrency: billData.currency,
        paymentType: billData.paymentDetails?.type || 'UNKNOWN'
      });

      // 2. Get Sera Swap Quote if source is not settlement currency
      // For now, assume user pays in USDC directly to our orchestration treasury
      
      res.json({
        bill: billData,
        quote: offrampQuote,
        paymentDestination: billData.paymentDetails,
        orchestrationId: `orch_${Math.random().toString(36).substring(7)}`
      });
    } catch (error: any) {
      console.error('Prepare Merchant Payment Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Execute the payment (Simulated)
   */
  static async executeMerchantPayment(req: any, res: Response) {
    try {
      const { quoteId, recipientDetails, amount, currency, sourceAsset } = req.body;
      const userId = req.user.userId;

      // 1. In a real app, verify user has signed the Sera transaction to move funds to Treasury
      // 2. Initialize Offramp
      const offramp = await offrampService.initializeOfframp({
        quoteId,
        recipientDetails,
        userId,
        amount,
        currency
      });

      // 3. Record in DB
      const { data: transaction, error } = await supabase
        .from('Transaction')
        .insert({
          senderId: userId,
          amount: amount,
          currency: currency,
          type: 'PAYMENT', // Will map to MERCHANT_PAYMENT in frontend logic
          caption: `Merchant Payment to ${recipientDetails.value}`,
          status: 'PENDING',
          visibility: 'PRIVATE',
          seraTxId: offramp.trackingId // Using tracking ID as reference
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        trackingId: offramp.trackingId,
        depositAddress: offramp.depositAddress,
        status: offramp.status,
        transaction
      });
    } catch (error: any) {
      console.error('Execute Merchant Payment Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Track status for the UI
   */
  static async trackStatus(req: Request, res: Response) {
    try {
      const { trackingId } = req.params;
      const status = await offrampService.getStatus(trackingId as string);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
