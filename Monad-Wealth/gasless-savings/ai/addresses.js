// ============================================================
// Deployed contract addresses — Monad testnet (chain 10143)
// Source: broadcast/Deploy.s.sol/10143/run-latest.json
// ============================================================
module.exports = {
  ENTRY_POINT:          "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  SAVINGS_VAULT:        "0xFEB8C8e4B23892cf3b67876AD71fF69D1a91EFa4",
  EXECUTION_MIDDLEWARE: "0x7Cd7C6B71453fEde67624f72044C52A4BCdcAC9a",
  BATCH_EXECUTOR:       "0xbf4d23e302C1CC355a974807585D6bb983e4269c",
  STRATEGY_ROUTER:      "0x147be16c232C2762B44ce0E2CCC27F96687D889A",
  MOCK_STRATEGY:        "0x05d75D2CC6C7750D14a9bfa1eEb7ECaa3F90e889",
  SAVINGS_PAYMASTER:    "0xD58B2390f141896f504BF867371940558d63c4E4",
  SMART_ACCOUNT_FACTORY:"0x1d93EC7f5339F714a68AdE332aDDa5494c07a294",
  // AIOracle deployed separately — set after running DeployAIOracle script
  AI_ORACLE:            process.env.AI_ORACLE_ADDR || "0xc19Bb206B681F549b9058944F296881A88D6fac9",
};
