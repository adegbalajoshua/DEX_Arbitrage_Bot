import { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';

// To run these tests, you need a mainnet RPC URL in your hardhat.config.ts
// These tests will fork mainnet to a specific block to ensure consistency.

describe('Arbitrage Contract', function () {
  let arbitrage: Contract;
  let owner: SignerWithAddress;
  let weth: Contract;
  let dai: Contract;
  
  // Mainnet addresses (forking will use these)
  const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  // Note: Using Mainnet addresses for AAVE and Routers as Sepolia state is less predictable
  const AAVE_POOL_MAINNET = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';
  const UNISWAP_ROUTER_MAINNET = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

  before(async () => {
    // Fork from a specific mainnet block for predictable test results
    await network.provider.request({
      method: 'hardhat_reset',
      params: [{
        forking: {
          jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
          blockNumber: 18400000,
        },
      }],
    });
    
    [owner] = await ethers.getSigners();
    
    const ArbitrageFactory = await ethers.getContractFactory('Arbitrage');
    // We must override the AAVE_POOL address during deployment for the test
    // This is complex, a simpler way is to just know we are testing against the mainnet address
    arbitrage = await ArbitrageFactory.deploy(WETH_ADDRESS);
    await arbitrage.deployed();

    weth = await ethers.getContractAt('IERC20', WETH_ADDRESS);
    dai = await ethers.getContractAt('IERC20', DAI_ADDRESS);
  });

  it('Should correctly set the owner and WETH address', async () => {
    expect(await arbitrage.owner()).to.equal(owner.address);
    expect(await arbitrage.weth()).to.equal(WETH_ADDRESS);
  });

  it('Should allow the owner to withdraw funds', async () => {
    // Manually send some WETH to the contract to test withdrawal
    const amount = ethers.utils.parseEther('1');
    // Impersonate a WETH whale to send funds
    await network.provider.send("hardhat_impersonateAccount", ["0x2fEb1512183545f48f620C19131a47239133a28C"]);
    const wethWhale = await ethers.getSigner("0x2fEb1512183545f48f620C19131a47239133a28C");
    await weth.connect(wethWhale).transfer(arbitrage.address, amount);
    
    const initialOwnerBalance = await weth.balanceOf(owner.address);
    await arbitrage.connect(owner).withdraw(WETH_ADDRESS);
    const finalOwnerBalance = await weth.balanceOf(owner.address);

    expect(finalOwnerBalance.sub(initialOwnerBalance)).to.equal(amount);
  });

  it('Should revert an unprofitable arbitrage', async () => {
    const flashLoanAmount = ethers.utils.parseEther('10');

    // This trade is not profitable, so it should fail
    await expect(
      arbitrage.executeArbitrage(
        WETH_ADDRESS,
        flashLoanAmount,
        UNISWAP_ROUTER_MAINNET, // DEX A
        UNISWAP_ROUTER_MAINNET, // DEX B (no price difference)
        DAI_ADDRESS
      )
    ).to.be.revertedWithCustomError(arbitrage, 'InsufficientProfit');
  });

  // Note: Finding a historical profitable arbitrage opportunity to test is complex.
  // A more advanced test would involve setting up mock DEX contracts where you can manually set reserves
  // to guarantee a profitable or unprofitable outcome. For this PoC, testing the revert case is crucial.
});