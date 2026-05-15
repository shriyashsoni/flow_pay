import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Analyze user spending habits and provide insights
   */
  async analyzeSpending(transactions: any[]) {
    const prompt = `
      Analyze the following financial transactions and provide a short, conversational summary of spending habits for a social payment app.
      Identify trends, potential savings, and categorize the spending.
      Transactions: ${JSON.stringify(transactions)}
      Return ONLY a JSON object with 'summary' and 'categories' keys.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text().replace(/```json|```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      return { summary: 'Analysis currently unavailable.', categories: [] };
    }
  }

  /**
   * Detect potential scams based on transaction metadata
   */
  async detectScam(txData: any) {
    const prompt = `
      Evaluate the following transaction data for potential fraud or scam patterns.
      Data: ${JSON.stringify(txData)}
      Return a risk score (0-100) and a brief reasoning.
      Return ONLY a JSON object with 'riskScore' and 'reasoning' keys.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text().replace(/```json|```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error('Gemini Scam Detection Error:', error);
      return { riskScore: 0, reasoning: 'Detection service offline.' };
    }
  }

  /**
   * General financial assistant chatbot
   */
  async getFinancialAdvice(query: string, userContext: any) {
    try {
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: 'You are FlowPay AI, a modern financial assistant for Gen Z. Be helpful, concise, and friendly.' }],
          },
          {
            role: 'model',
            parts: [{ text: 'Got it! I am ready to help with FlowPay transactions and financial advice.' }],
          },
        ],
      });

      const result = await chat.sendMessage(`User context: ${JSON.stringify(userContext)}\n\nQuery: ${query}`);
      return result.response.text();
    } catch (error) {
      console.error('Gemini Chat Error:', error);
      return "I'm having trouble thinking right now. Ask me again in a bit!";
    }
  }

  /**
   * Parse a bill image using Gemini Multimodal OCR
   */
  async parseBillImage(imageBuffer: Buffer, mimeType: string) {
    const prompt = `
      Look at this receipt, bill, or QR code image. 
      Your goal is to extract the Merchant name, the Amount due, and most importantly, the Payment Destination (Rail).

      1. **Merchant**: Extract the name of the establishment/merchant.
      2. **Items**: List major items with their quantities and prices if visible.
      3. **Total & Currency**: Identify the total amount and the ISO currency code (e.g., INR, USD, EUR, GBP).
      4. **Payment Destination (CRITICAL)**: Analyze the image for any payment rails:
         - **UPI**: Look for virtual payment addresses (e.g., merchant@upi, paytmqr123@okbizaxis).
         - **IBAN/SEPA**: Look for IBAN numbers starting with country codes (e.g., DE, FR, GB) and BIC/SWIFT codes.
         - **ACH/Domestic Bank**: Look for Account Numbers and Routing/Sort codes.
         - **QR Code**: If there is a QR code, describe its likely type (e.g., "Standard UPI QR", "Stripe Payment Link QR").
         - **Credit Card**: Look for "Pay to" details for card bills, such as a biller ID or card network.

      Return ONLY a JSON object with these keys: 
      'establishment', 
      'items' (array of {name, price}), 
      'total' (number), 
      'currency' (string, e.g. "INR"),
      'paymentDetails': {
        'type': 'UPI' | 'BANK' | 'CARD_BILL' | 'QR' | 'STRIPE_LINK' | 'UNKNOWN',
        'value': 'the actual ID, IBAN, or account number',
        'raw': 'any other visible payment metadata',
        'country': 'ISO country code if detectable'
      }
    `;

    try {
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType,
          },
        },
      ]);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error('Bill Scan Error:', error);
      throw error;
    }
  }

  /**
   * Parse natural language into a payment intent
   * Example: "Pay @shriyash $20 for the dinner"
   */
  async parsePaymentIntent(text: string) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `
        Parse this payment request into JSON format: "${text}"
        Return ONLY valid JSON with fields:
        {
          "recipient": "username (without @)",
          "amount": number,
          "currency": "USDC",
          "note": "reason for payment",
          "action": "PAYMENT" | "REQUEST" | "UNKNOWN"
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text().replace(/```json|```/g, '').trim());
    } catch (error) {
      console.error('AI Intent Error:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
