import { expect } from "chai";
import { ethers } from "hardhat";

describe("AutoPayAgent", function () {
  async function deployFixture() {
    const [payer, recipient] = await ethers.getSigners();

    const autoPayAgentFactory = await ethers.getContractFactory("AutoPayAgent");
    const autoPayAgent = await autoPayAgentFactory.deploy();
    await autoPayAgent.waitForDeployment();

    const mockUsdcFactory = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await mockUsdcFactory.deploy();
    await mockUsdc.waitForDeployment();

    return { payer, recipient, autoPayAgent, mockUsdc };
  }

  it("sends native MON-style value to a recipient", async function () {
    const { payer, recipient, autoPayAgent } = await deployFixture();
    const ruleId = ethers.encodeBytes32String("native");
    const amount = ethers.parseEther("0.5");

    await expect(
      autoPayAgent.connect(payer).executeNativePayment(ruleId, recipient.address, {
        value: amount,
      }),
    )
      .to.emit(autoPayAgent, "NativePaymentExecuted")
      .withArgs(ruleId, payer.address, recipient.address, amount);
  });

  it("moves approved ERC20 tokens from the payer to the recipient", async function () {
    const { payer, recipient, autoPayAgent, mockUsdc } = await deployFixture();
    const ruleId = ethers.encodeBytes32String("token");
    const amount = 42n * 10n ** 6n;

    await mockUsdc.mint(payer.address, 100n * 10n ** 6n);
    await mockUsdc.connect(payer).approve(await autoPayAgent.getAddress(), amount);

    await expect(
      autoPayAgent
        .connect(payer)
        .executeTokenPayment(ruleId, await mockUsdc.getAddress(), recipient.address, amount),
    )
      .to.emit(autoPayAgent, "TokenPaymentExecuted")
      .withArgs(ruleId, payer.address, await mockUsdc.getAddress(), recipient.address, amount);

    expect(await mockUsdc.balanceOf(recipient.address)).to.equal(amount);
  });
}
