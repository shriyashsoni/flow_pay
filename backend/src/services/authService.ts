import { PrivyClient } from '@privy-io/node';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';

const privy = new PrivyClient({
  appId: config.PRIVY_APP_ID!,
  appSecret: config.PRIVY_APP_SECRET!
});

// Setup JWKS for Privy token verification
const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${config.PRIVY_APP_ID}/jwks.json`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err || !key) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export class AuthService {
  /**
   * Verify the Privy ID token from the frontend
   */
  static async verifyToken(token: string) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        issuer: 'privy.io',
        audience: config.PRIVY_APP_ID
      }, (err, decoded) => {
        if (err) {
          console.error('Privy Token Verification Error:', err);
          return reject(new Error('Unauthorized'));
        }
        resolve(decoded);
      });
    });
  }

}
