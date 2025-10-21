import { ethers } from 'ethers';
import { expect } from 'chai';
import { calculateProfitability } from '../src/utils';

describe('Profitability Calculation', () => {
  const ONE_ETH = ethers.utils.parseEther('1');

  it('should calculate a profitable scenario correctly', () => {
    const amountIn = ethers.utils.parseEther('10'); // 10 WETH
    
    // Scenario: Price of DAI is cheaper on DEX A
    // DEX A (Uniswap): 1 WETH = 3000 DAI
    const reservesA: [ethers.BigNumber, ethers.BigNumber] = [
      ethers.utils.parseEther('100'),   // WETH reserve
      ethers.utils.parseEther('300000') // DAI reserve
    ];
    // DEX B (Sushiswap): 1 WETH = 3005 DAI
    const reservesB: [ethers.BigNumber, ethers.BigNumber] = [
      ethers.utils.parseEther('100'),   // WETH reserve
      ethers.utils.parseEther('300500') // DAI reserve
    ];

    const profit = calculateProfitability(amountIn, reservesA, reservesB);
    // Expecting a positive number
    expect(profit.gt(0)).to.be.true;
  });

  it('should result in a loss for an unprofitable scenario', () => {
    const amountIn = ethers.utils.parseEther('10');
    
    // Scenario: Prices are identical
    const reserves: [ethers.BigNumber, ethers.BigNumber] = [
      ethers.utils.parseEther('100'),
      ethers.utils.parseEther('300000')
    ];

    const profit = calculateProfitability(amountIn, reserves, reserves);
    // Because of fees, the profit must be negative
    expect(profit.lt(0)).to.be.true;
  });

  it('should handle large numbers without overflow', () => {
    const amountIn = ethers.utils.parseEther('1000');
    
    const reservesA: [ethers.BigNumber, ethers.BigNumber] = [
      ethers.utils.parseEther('10000'),
      ethers.utils.parseEther('30000000')
    ];
    const reservesB: [ethers.BigNumber, ethers.BigNumber] = [
        ethers.utils.parseEther('10000'),
        ethers.utils.parseEther('30050000')
    ];

    const profit = calculateProfitability(amountIn, reservesA, reservesB);
    expect(profit.gt(0)).to.be.true;
  });
});