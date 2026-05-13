import { PrivyClient } from '@privy-io/node';
import { config } from '../config';

const privy = new PrivyClient(config.PRIVY_APP_ID!, config.PRIVY_APP_SECRET!);

export class AuthService {
  /**
   * Verify the Privy ID token from the frontend
   */
  static async verifyToken(token: string) {
    try {
      const verifiedClaims = await privy.verifyAuthToken(token);
      return verifiedClaims;
    } catch (error) {
      console.error('Privy Token Verification Error:', error);
      throw new Error('Unauthorized');
    }
  }

  /**
   * Get user details from Privy by ID
   */
  static async getUser(userId: string) {
    return await privy.getUser(userId);
  }
}
