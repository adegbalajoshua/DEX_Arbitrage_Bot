import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, '../.env') });

// Ensure all required environment variables are set
if (!process.env.RPC_URL_WSS || !process.env.PRIVATE_KEY || !process.env.ARBITRAGE_CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables. Please check your .env file.");
}

// Bot Configuration
export const config = {
  rpcUrl: process.env.RPC_URL_WSS,
  privateKey: process.env.PRIVATE_KEY,
  contractAddress: process.env.ARBITRAGE_CONTRACT_ADDRESS,
};

// Arbitrage settings
export const settings = {
  // The minimum profit in USD to trigger an arbitrage.
  // Set high for testing to avoid wasting gas.
  minProfitThresholdUSD: 5,
  // The amount of WETH to use in the flash loan.
  flashLoanAmount: '1', // e.g., 1 WETH
};

export const addresses = {
  WETH: '0x4200000000000000000000000000000000000006', // WETH on Base
  DAI: '0x...', // Find the DAI or equivalent stablecoin address on Base
  aaveV3Pool: '0x...', // Find the Aave V3 Pool address on Base
  uniswapV2Router: '0x...', // Find a Uniswap V2 fork router on Base
  sushiswapRouter: '0x...', // Find another DEX router on Base
};
