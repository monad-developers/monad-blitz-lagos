import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  const autoPayAgentFactory = await ethers.getContractFactory("AutoPayAgent");
  const autoPayAgent = await autoPayAgentFactory.deploy();
  await autoPayAgent.waitForDeployment();

  const mockUsdcFactory = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await mockUsdcFactory.deploy();
  await mockUsdc.waitForDeployment();

  console.log("AutoPayAgent:", await autoPayAgent.getAddress());
  console.log("MockUSDC:", await mockUsdc.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
