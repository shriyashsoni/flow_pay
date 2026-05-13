import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 4001,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SERA_API_KEY: process.env.SERA_API_KEY || '',
  SERA_API_SECRET: process.env.SERA_API_SECRET || '',
  SERA_BASE_URL: process.env.SERA_BASE_URL || 'https://api.sera.cx/api/v1',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET || 'flowpay-super-secret',
  PRIVY_APP_ID: process.env.PRIVY_APP_ID,
  PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
};
