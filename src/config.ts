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

// Token & DEX Addresses for Sepolia Testnet
export const addresses = {
  WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
  uniswapV2Router: '0xC532a74256D3Db421739eff4C62325Ab08118683',
  sushiswapRouter: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
};