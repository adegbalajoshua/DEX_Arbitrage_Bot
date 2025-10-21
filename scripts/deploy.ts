import { ethers } from 'hardhat';
import { addresses } from '../src/config'; // Reuse config for WETH address

async function main() {
  const Arbitrage = await ethers.getContractFactory('Arbitrage');
  console.log('Deploying Arbitrage contract...');
  
  const arbitrage = await Arbitrage.deploy(addresses.WETH); // Pass Sepolia WETH address

  await arbitrage.deployed();

  console.log(`Arbitrage contract deployed to: ${arbitrage.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});