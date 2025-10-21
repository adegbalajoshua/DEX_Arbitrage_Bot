import { ethers } from 'ethers';
import { config, settings, addresses } from './config';
import { calculateProfitability } from './utils';

// ABI for Uniswap V2 Pair to get reserves
const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

// ABI for our deployed Arbitrage contract
const ARBITRAGE_CONTRACT_ABI = [
    "function executeArbitrage(address flashLoanToken, uint256 flashLoanAmount, address dexRouterA, address dexRouterB, address tradeToken) external",
];

// Set up provider, wallet, and contract instances
const provider = new ethers.providers.WebSocketProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.privateKey, provider);
const arbitrageContract = new ethers.Contract(config.contractAddress, ARBITRAGE_CONTRACT_ABI, wallet);

console.log("🤖 Arbitrage Bot Started");
console.log(`Watching for opportunities on block events...`);
console.log(`Minimum profit threshold: $${settings.minProfitThresholdUSD}`);

/**
 * @description Main function to check for arbitrage opportunities on each new block.
 */
const checkArbitrage = async () => {
  try {
    // Assume WETH is token0 and DAI is token1 based on Uniswap pair creation
    // You may need a more robust way to determine this in a real scenario
    const UNISWAP_PAIR_ADDRESS = '0x1a840552B5B49d525BA65d3a27072522435F3E22'; // WETH/DAI on Sepolia
    const SUSHISWAP_PAIR_ADDRESS = '0x43aE14AB2d525A41793BF256F28A55c15C9b2518'; // WETH/DAI on Sepolia

    const uniPair = new ethers.Contract(UNISWAP_PAIR_ADDRESS, UNISWAP_V2_PAIR_ABI, provider);
    const sushiPair = new ethers.Contract(SUSHISWAP_PAIR_ADDRESS, UNISWAP_V2_PAIR_ABI, provider);

    // Get reserves from both DEXes in parallel
    const [uniReserves, sushiReserves] = await Promise.all([
      uniPair.getReserves(),
      sushiPair.getReserves()
    ]);

    console.log(`[BLOCK ${await provider.getBlockNumber()}] Reserves | Uniswap: ${uniReserves[0]}, ${uniReserves[1]} | Sushiswap: ${sushiReserves[0]}, ${sushiReserves[1]}`);

    const flashLoanAmountBN = ethers.utils.parseUnits(settings.flashLoanAmount, 18); // Using 18 decimals for WETH

    // Opportunity 1: Buy on Uniswap, Sell on Sushiswap
    const profit1 = calculateProfitability(flashLoanAmountBN, uniReserves, sushiReserves);

    // Opportunity 2: Buy on Sushiswap, Sell on Uniswap
    const profit2 = calculateProfitability(flashLoanAmountBN, sushiReserves, uniReserves);

    if (profit1.gt(0)) {
        console.log(`📈 Opportunity Found! Buy on Uniswap, Sell on Sushiswap. Gross Profit: ${ethers.utils.formatEther(profit1)} WETH`);
        // TODO: Add gas cost estimation and profit threshold check before executing
        await executeTrade(addresses.uniswapV2Router, addresses.sushiswapRouter, flashLoanAmountBN);
    } else if (profit2.gt(0)) {
        console.log(`📈 Opportunity Found! Buy on Sushiswap, Sell on Uniswap. Gross Profit: ${ethers.utils.formatEther(profit2)} WETH`);
        // TODO: Add gas cost estimation and profit threshold check before executing
        await executeTrade(addresses.sushiswapRouter, addresses.uniswapV2Router, flashLoanAmountBN);
    }

  } catch (error) {
    console.error("An error occurred while checking for arbitrage:", error);
  }
};

/**
 * @description Executes the arbitrage trade by calling the smart contract.
 */
const executeTrade = async (buyRouter: string, sellRouter: string, amount: ethers.BigNumber) => {
    try {
        console.log(`🚀 Executing arbitrage: Borrowing ${ethers.utils.formatEther(amount)} WETH...`);

        const tx = await arbitrageContract.executeArbitrage(
            addresses.WETH,
            amount,
            buyRouter,
            sellRouter,
            addresses.DAI,
            { gasLimit: 1000000 } // Set a reasonable gas limit
        );

        console.log(`✅ Transaction sent! Hash: ${tx.hash}`);
        console.log(`🔍 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`🎉 Transaction confirmed in block ${receipt.blockNumber}!`);

    } catch (error: any) {
        console.error("❌ Arbitrage execution failed:", error.reason || error.message);
    }
};

// Listen for new blocks and run the check
provider.on('block', checkArbitrage);