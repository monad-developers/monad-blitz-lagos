import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GiveawayModule", (m) => {
  const g = m.contract("GiveawayV1", [
    "0xc80211D0a75dd550e54Ea8FE6Eb71a70971269b8",
  ]);

  return { g };
});
