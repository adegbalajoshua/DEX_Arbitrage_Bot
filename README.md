# DEX Arbitrage Bot (Proof-of-Concept) 🤖

This project is a functional proof-of-concept for a Decentralized Exchange (DEX) arbitrage bot. It leverages Aave V3 flash loans to execute trades atomically on Uniswap V2 forks, capitalizing on price discrepancies between two exchanges.

The project consists of:

- An **on-chain Solidity smart contract** for atomic execution (Arbitrage.sol).
- An **off-chain TypeScript bot** for monitoring the blockchain and triggering trades.

## ⚠️ Disclaimer: For Educational Use Only

**This is a proof-of-concept and is NOT production-ready.** Arbitrage on a live blockchain is extremely competitive and risky. Using this bot on the Ethereum mainnet or any other mainnet could lead to a **complete loss of funds** due to:

- Failed transactions and wasted gas fees.
- Competition from more sophisticated bots (front-running).
- Smart contract vulnerabilities.
- Volatile network conditions.

**Use this code on a testnet (like Sepolia) for educational purposes only.** Do not deploy real funds without extensive modification, backtesting, and a deep understanding of the associated risks.

## Prerequisites

Before you begin, ensure you have the following installed:

- [**Node.js**](https://nodejs.org/en/) (v18 or later recommended)
- [**npm**](https://www.npmjs.com/) (usually comes with Node.js)
- A code editor like [**VS Code**](https://code.visualstudio.com/)

## How It Works

- **Monitoring**: The TypeScript bot connects to an EVM testnet (e.g., Sepolia) via a WebSocket and listens for new blocks.
- **Analysis**: On each new block, the bot fetches the token reserves for a specific pair (e.g., WETH/DAI) from two different DEXes (e.g., Uniswap and Sushiswap).
- **Calculation**: It calculates if a profitable arbitrage opportunity exists by simulating a trade, accounting for DEX swap fees (0.3%).
- **Execution**: If a profitable opportunity is found that exceeds a defined threshold, the bot's wallet signs and sends a transaction to the executeArbitrage function on your deployed Arbitrage.sol contract.
- Atomic Transaction: The smart contract performs the following steps in a single, atomic transaction:  
   a. Borrows a large amount of an asset (e.g., WETH) from the Aave V3 protocol via a flash loan.  
   b. Swaps the borrowed WETH for DAI on the cheaper DEX.  
   c. Swaps the resulting DAI back to WETH on the more expensive DEX.  
   d. Checks if the final WETH amount is greater than the initial loan plus the Aave premium (fee).  
   e. If profitable, it repays the loan and keeps the profit inside the smart contract.  
   f. If not profitable, the entire transaction reverts, ensuring the flash loan is always repaid and no funds are lost (except for the gas fee for the failed transaction).

## Installation

- **Clone the repository:**  
   ```sh
   git clone https://github.com/adegbalajoshua/DEX_Arbitrage_Bot;  
   cd DEX_Arbitrage_Bot
   ```
- **Install dependencies:**  
  ```sh
  npm install
  ```
## Configuration

- **Create an environment file:** Copy the example file to create your local configuration.  
   cp .env.example .env

- **Edit the .env file** with your specific details:
  - RPC_URL_WSS: Your **WebSocket** RPC URL for the Sepolia testnet. You can get one for free from services like [Infura](https://www.infura.io/) or [Alchemy](https://www.alchemy.com/).
  - PRIVATE_KEY: The private key of the wallet you will use. **See the security section below.**
  - ARBITRAGE_CONTRACT_ADDRESS: This will be filled in after you deploy the contract.
  - ETHERSCAN_API_KEY (Optional): Your Etherscan API key for contract verification.
  - INFURA_PROJECT_ID (Optional): Your Infura Project ID, used for running the mainnet fork tests.

## 🔐 Security Best Practices

- **Dedicated Wallet**: **NEVER** use your primary wallet's private key. Create a new, dedicated wallet exclusively for this bot.
- **Fund Minimally**: Only fund the bot's wallet with enough testnet ETH to cover gas fees for a few dozen transactions. Profits accumulate in the smart contract, not this wallet.
- **.env File**: The .env file should be listed in your .gitignore (it is by default) to prevent you from ever committing your private keys to a public repository.

## Usage Guide

### Step 1: Compile the Smart Contract

First, compile the Solidity code to ensure everything is correct.
```bash
npx hardhat compile
```
### Step 2: Run Smart Contract Tests

These tests run on a temporary fork of the Ethereum mainnet, allowing for realistic simulations without spending real gas.
```bash
npx hardhat test test/Arbitrage.test.ts
```
### Step 3: Deploy the Smart Contract

Deploy the contract to the Sepolia testnet.
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```
After deployment, the script will output the contract address. **Copy this address and paste it into your .env file** for the ARBITRAGE_CONTRACT_ADDRESS variable.

### Step 4: Run Bot Logic Tests

Test the off-chain profitability calculation to ensure it behaves as expected.
```bash
npm run test:bot
```
### Step 5: Run the Arbitrage Bot

Start the bot to begin monitoring the blockchain for opportunities.
```bash
npm start
```
The bot will log its activity to the console, including the prices it's checking and any transactions it sends.

## Troubleshooting

- **Error: Missing required environment variables**: Ensure your .env file is correctly named and located in the project's root directory, and that all required variables are filled in.
- **Transaction Fails / Reverts**:
  - Check the transaction on a block explorer (like Sepolia Etherscan). The error message (e.g., InsufficientProfit) will often tell you why it failed.
  - Your bot's wallet may have insufficient Sepolia ETH to pay for gas.
  - The RPC node might be slow or out of sync. Try restarting the bot.
- **Bot doesn't find opportunities**: Arbitrage opportunities on testnets are rare and often manufactured. The main goal here is to ensure the bot runs and can execute a transaction if an opportunity _does_ appear.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
