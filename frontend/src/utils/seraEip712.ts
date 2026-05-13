/**
 * Sera EIP-712 Type Definitions
 * Live Mainnet configuration (Chain ID 1)
 * Contract: 0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198
 */

export const SERA_DOMAIN = {
  name: 'Sera',
  version: '1',
  chainId: 1,
  verifyingContract: '0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198'
};

export const SERA_TYPES = {
  ManageApiKey: [
    { name: 'owner', type: 'address' },
    { name: 'action', type: 'string' },
    { name: 'timestamp', type: 'uint256' }
  ],
  Order: [
    { name: 'user', type: 'address' },
    { name: 'expiration', type: 'uint48' },
    { name: 'feeBps', type: 'uint48' },
    { name: 'recipient', type: 'address' },
    { name: 'fromToken', type: 'address' },
    { name: 'toToken', type: 'address' },
    { name: 'fromAmount', type: 'uint256' },
    { name: 'toAmount', type: 'uint256' },
    { name: 'initialDepositAmount', type: 'uint256' },
    { name: 'uuid', type: 'uint256' }
  ],
  Intent: [
    { name: 'taker', type: 'address' },
    { name: 'inputToken', type: 'address' },
    { name: 'outputToken', type: 'address' },
    { name: 'maxInputAmount', type: 'uint256' },
    { name: 'minOutputAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'initialDepositAmount', type: 'uint256' },
    { name: 'uuid', type: 'uint256' },
    { name: 'deadline', type: 'uint48' }
  ],
  CancelOrder: [
    { name: 'owner', type: 'address' },
    { name: 'orderId', type: 'uint256' }
  ],
  WithdrawIntent: [
    { name: 'user', type: 'address' },
    { name: 'tokens', type: 'address[]' },
    { name: 'amounts', type: 'uint256[]' },
    { name: 'recipient', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'uuid', type: 'uint256' }
  ]
};

// Mainnet USDC contract address
export const MAINNET_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
