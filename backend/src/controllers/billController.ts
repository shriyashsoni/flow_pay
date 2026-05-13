import type { Request, Response } from 'express';
import { aiService } from '../services/aiService';

export class BillController {
  static async scanBill(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const billData = await aiService.parseBillImage(
        req.file.buffer,
        req.file.mimetype
      );

      res.json(billData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async splitBill(req: Request, res: Response) {
    try {
      const { total, splitCount, friendUsernames } = req.body;
      const share = total / (splitCount || friendUsernames.length + 1);

      // In a real app, this would create payment requests for each friend
      res.json({
        total,
        share,
        message: `Split created for ${friendUsernames.length} friends.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
