import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config';

// For Privy token verification, we use JWKS
// Privy publishes their public keys at this endpoint
const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${config.PRIVY_APP_ID}/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded: any = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          issuer: 'privy.io',
          audience: config.PRIVY_APP_ID,
          algorithms: ['ES256'],
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    // Privy tokens have 'sub' as the user ID (e.g., "did:privy:xxxx")
    (req as any).user = { userId: decoded.sub };
    next();
  } catch (error: any) {
    console.error('Auth Error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
