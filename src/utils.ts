import { ethers } from 'ethers';

/**
 * @description Calculates the potential profit from an arbitrage opportunity.
 * @param amountIn The initial amount of the input token (e.g., from flash loan).
 * @param reservesA The token reserves for the pair on DEX A.
 * @param reservesB The token reserves for the pair on DEX B.
 * @returns The gross profit (before fees and gas) in the input token's denomination.
 */
export function calculateProfitability(
  amountIn: ethers.BigNumber,
  reservesA: [ethers.BigNumber, ethers.BigNumber],
  reservesB: [ethers.BigNumber, ethers.BigNumber]
): ethers.BigNumber {
  // Constants
  const DEX_FEE = 997; // Uniswap V2 fee is 0.3%, so we get 99.7% of the output
  const SCALE = 1000;

  // 1. First Swap: amountIn -> amountOut on DEX A
  const amountInWithFee = amountIn.mul(DEX_FEE);
  const numeratorA = amountInWithFee.mul(reservesA[1]);
  const denominatorA = reservesA[0].mul(SCALE).add(amountInWithFee);
  const amountOutA = numeratorA.div(denominatorA);

  // 2. Second Swap: amountOutA -> finalAmount on DEX B
  const amountOutAWithFee = amountOutA.mul(DEX_FEE);
  const numeratorB = amountOutAWithFee.mul(reservesB[0]);
  const denominatorB = reservesB[1].mul(SCALE).add(amountOutAWithFee);
  const finalAmountOut = numeratorB.div(denominatorB);

  // 3. Calculate gross profit
  const grossProfit = finalAmountOut.sub(amountIn);
  return grossProfit;
}