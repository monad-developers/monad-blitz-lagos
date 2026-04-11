export const AJOCHAIN_ADDRESS = process.env.NEXT_PUBLIC_AJOCHAIN_ADDRESS as `0x${string}`;

export const AJOCHAIN_ABI = [
  // Intent
  { name: "registerIntent", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "contributionAmount", type: "uint256" },
      { name: "desiredGroupSize",   type: "uint8" },
      { name: "roundDuration",      type: "uint256" },
    ], outputs: [] },

  { name: "getAllIntents", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "tuple[]", components: [
      { name: "wallet",             type: "address" },
      { name: "contributionAmount", type: "uint256" },
      { name: "desiredGroupSize",   type: "uint8" },
      { name: "roundDuration",      type: "uint256" },
      { name: "matched",            type: "bool" },
    ]}] },

  { name: "walletIntent", type: "function", stateMutability: "view",
    inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },

  // Collateral & payment
  { name: "lockCollateral", type: "function", stateMutability: "payable",
    inputs: [{ name: "groupId", type: "uint256" }], outputs: [] },

  { name: "payContribution", type: "function", stateMutability: "payable",
    inputs: [{ name: "groupId", type: "uint256" }], outputs: [] },

  // Views
  { name: "groupCount", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },

  { name: "getAllActiveGroups", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256[]" }] },

  { name: "getMemberGroups", type: "function", stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256[]" }] },

  { name: "getGroup", type: "function", stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "id",                 type: "uint256" },
      { name: "contributionAmount", type: "uint256" },
      { name: "collateralAmount",   type: "uint256" },
      { name: "totalMembers",       type: "uint8" },
      { name: "currentRound",       type: "uint8" },
      { name: "paidCount",          type: "uint8" },
      { name: "roundDeadline",      type: "uint256" },
      { name: "roundDuration",      type: "uint256" },
      { name: "status",             type: "uint8" },
      { name: "fundStatus",         type: "uint8" },
      { name: "stMonShares",        type: "uint256" },
      { name: "yieldEarned",        type: "uint256" },
      { name: "createdAt",          type: "uint256" },
      { name: "memberAddresses",    type: "address[]" },
    ]}] },

  { name: "getGroupMembers", type: "function", stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "wallet",            type: "address" },
      { name: "hasPaid",           type: "bool" },
      { name: "hasCollateral",     type: "bool" },
      { name: "hasReceivedPayout", type: "bool" },
      { name: "creditScore",       type: "uint256" },
      { name: "defaultCount",      type: "uint8" },
    ]}] },

  { name: "getMember", type: "function", stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }, { name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "wallet",            type: "address" },
      { name: "hasPaid",           type: "bool" },
      { name: "hasCollateral",     type: "bool" },
      { name: "hasReceivedPayout", type: "bool" },
      { name: "creditScore",       type: "uint256" },
      { name: "defaultCount",      type: "uint8" },
    ]}] },

  { name: "getIdleFunds", type: "function", stateMutability: "view",
    inputs: [{ name: "groupId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },

  // Events
  { name: "IntentRegistered",    type: "event", inputs: [
    { name: "intentId", type: "uint256", indexed: true },
    { name: "wallet",   type: "address", indexed: true },
    { name: "amount",   type: "uint256" }, { name: "groupSize", type: "uint8" }, { name: "roundDuration", type: "uint256" }] },
  { name: "GroupCreated",        type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true },
    { name: "members", type: "address[]" }, { name: "contributionAmount", type: "uint256" }, { name: "roundDuration", type: "uint256" }] },
  { name: "CollateralLocked",    type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true }, { name: "member", type: "address", indexed: true }] },
  { name: "GroupActivated",      type: "event", inputs: [{ name: "groupId", type: "uint256", indexed: true }] },
  { name: "ContributionPaid",    type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true }, { name: "round", type: "uint8" }, { name: "member", type: "address", indexed: true }] },
  { name: "RoundAdvanced",       type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true }, { name: "newRound", type: "uint8" },
    { name: "winner", type: "address", indexed: true }, { name: "payout", type: "uint256" }] },
  { name: "FundsDeployedToYield", type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true }, { name: "monAmount", type: "uint256" }, { name: "sharesReceived", type: "uint256" }] },
  { name: "FundsWithdrawnFromYield", type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true }, { name: "sharesRedeemed", type: "uint256" }, { name: "monReturned", type: "uint256" }] },
  { name: "CollateralSlashed",   type: "event", inputs: [
    { name: "groupId", type: "uint256", indexed: true }, { name: "defaulter", type: "address", indexed: true },
    { name: "amount", type: "uint256" }, { name: "reason", type: "string" }] },
  { name: "CreditScoreUpdated",  type: "event", inputs: [
    { name: "wallet", type: "address", indexed: true }, { name: "groupId", type: "uint256", indexed: true },
    { name: "newScore", type: "uint256" }, { name: "reason", type: "string" }] },
] as const;

// Group status enum
export const GROUP_STATUS = ["Forming", "Active", "Completed", "Cancelled"] as const;
export const FUND_STATUS  = ["Idle", "Deployed"] as const;
