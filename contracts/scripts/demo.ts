import { ethers } from "hardhat";

async function main() {
  const [payer, recipient] = await ethers.getSigners();

  const autoPayAgentFactory = await ethers.getContractFactory("AutoPayAgent");
  const autoPayAgent = await autoPayAgentFactory.deploy();
  await autoPayAgent.waitForDeployment();

  const mockUsdcFactory = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await mockUsdcFactory.deploy();
  await mockUsdc.waitForDeployment();

  const ruleId = ethers.encodeBytes32String("demo-rule");
  const usdcAmount = 25n * 10n ** 6n;

  await (await mockUsdc.mint(payer.address, 1_000n * 10n ** 6n)).wait();
  await (await mockUsdc.approve(await autoPayAgent.getAddress(), usdcAmount)).wait();

  await (
    await autoPayAgent.executeTokenPayment(
      ruleId,
      await mockUsdc.getAddress(),
      recipient.address,
      usdcAmount,
    )
  ).wait();
  await (
    await autoPayAgent.executeNativePayment(ruleId, recipient.address, {
      value: ethers.parseEther("0.2"),
    })
  ).wait();

  console.log("Demo complete");
  console.log("AutoPayAgent:", await autoPayAgent.getAddress());
  console.log("MockUSDC:", await mockUsdc.getAddress());
  console.log("Recipient USDC balance:", await mockUsdc.balanceOf(recipient.address));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
