import { ethers } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SERA_BASE_URL = 'https://api.sera.cx/api/v1';

async function generateSeraKey() {
  if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  const walletAddress = wallet.address;

  try {
    // 1. Fetch Live Sera Config & Time
    console.log('🕒 Fetching live Sera configuration and time...');
    const configRes = await axios.get(`${SERA_BASE_URL}/config`);
    const timeRes = await axios.get(`${SERA_BASE_URL}/system/time`);
    
    const liveDomain = configRes.data.eip712_domain;
    const timestamp = timeRes.data.timestamp;

    console.log(`🚀 Generating Sera API Key for: ${walletAddress}...`);
    console.log(`📡 Using Domain: ${JSON.stringify(liveDomain)}`);

    const types = {
      ManageApiKey: [
        { name: 'owner', type: 'address' },
        { name: 'action', type: 'string' },
        { name: 'timestamp', type: 'uint256' }
      ]
    };

    // 2. Sign the EIP-712 Message using LIVE config
    const signature = await wallet.signTypedData(liveDomain, types, {
      owner: walletAddress,
      action: 'create',
      timestamp
    });

    // 3. Post to Sera
    const response = await axios.post(`${SERA_BASE_URL}/api-keys`, {
      owner_address: walletAddress,
      action: 'create',
      timestamp,
      signature,
      label: 'FlowPay Main Backend'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const { api_key, api_secret } = response.data;

    console.log('\n✅ SUCCESS! Sera API Key Generated:');
    console.log('------------------------------------');
    console.log(`SERA_API_KEY="${api_key}"`);
    console.log(`SERA_API_SECRET="${api_secret}"`);
    console.log('------------------------------------');
    console.log('⚠️  Store your API_SECRET safely! It is only shown once.');

  } catch (error: any) {
    console.error('❌ Sera API Error:', error.response?.data || error.message);
  }
}

generateSeraKey();
