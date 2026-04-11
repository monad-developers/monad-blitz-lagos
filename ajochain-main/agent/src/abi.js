export const AJOCHAIN_ABI = [
  // Intent
  "function registerIntent(uint256 contributionAmount, uint8 desiredGroupSize, uint256 roundDuration) external",
  "function intentCount() external view returns (uint256)",
  "function intents(uint256) external view returns (address wallet, uint256 contributionAmount, uint8 desiredGroupSize, uint256 roundDuration, bool matched)",
  "function getAllIntents() external view returns (tuple(address wallet, uint256 contributionAmount, uint8 desiredGroupSize, uint256 roundDuration, bool matched)[])",
  "function walletIntent(address) external view returns (uint256)",

  // Group management (agent)
  "function createGroup(address[] calldata memberWallets, uint256 contributionAmount, uint256 roundDuration) external returns (uint256 groupId)",
  "function advanceRound(uint256 groupId, address winner) external",
  "function handleDefault(uint256 groupId, address defaulter, address winner, string calldata reason) external",

  // Yield (agent)
  "function deployToYield(uint256 groupId) external",
  "function withdrawFromYield(uint256 groupId) external",

  // User actions
  "function lockCollateral(uint256 groupId) external payable",
  "function payContribution(uint256 groupId) external payable",

  // Views
  "function groupCount() external view returns (uint256)",
  "function getAllActiveGroups() external view returns (uint256[])",
  "function getGroup(uint256 groupId) external view returns (tuple(uint256 id, uint256 contributionAmount, uint256 collateralAmount, uint8 totalMembers, uint8 currentRound, uint8 paidCount, uint256 roundDeadline, uint256 roundDuration, uint8 status, uint8 fundStatus, uint256 stMonShares, uint256 yieldEarned, uint256 createdAt, address[] memberAddresses))",
  "function getMember(uint256 groupId, address wallet) external view returns (tuple(address wallet, bool hasPaid, bool hasCollateral, bool hasReceivedPayout, uint256 creditScore, uint8 defaultCount))",
  "function getGroupMembers(uint256 groupId) external view returns (tuple(address wallet, bool hasPaid, bool hasCollateral, bool hasReceivedPayout, uint256 creditScore, uint8 defaultCount)[])",
  "function getIdleFunds(uint256 groupId) external view returns (uint256)",
  "function getMemberGroups(address wallet) external view returns (uint256[])",

  // Events
  "event IntentRegistered(uint256 indexed intentId, address indexed wallet, uint256 amount, uint8 groupSize, uint256 roundDuration)",
  "event GroupCreated(uint256 indexed groupId, address[] members, uint256 contributionAmount, uint256 roundDuration)",
  "event CollateralLocked(uint256 indexed groupId, address indexed member)",
  "event GroupActivated(uint256 indexed groupId)",
  "event ContributionPaid(uint256 indexed groupId, uint8 round, address indexed member)",
  "event RoundAdvanced(uint256 indexed groupId, uint8 newRound, address indexed winner, uint256 payout)",
  "event FundsDeployedToYield(uint256 indexed groupId, uint256 monAmount, uint256 sharesReceived)",
  "event FundsWithdrawnFromYield(uint256 indexed groupId, uint256 sharesRedeemed, uint256 monReturned)",
  "event CollateralSlashed(uint256 indexed groupId, address indexed defaulter, uint256 amount, string reason)",
  "event MemberDefaulted(uint256 indexed groupId, uint8 round, address indexed defaulter)",
  "event GroupCompleted(uint256 indexed groupId)",
  "event CreditScoreUpdated(address indexed wallet, uint256 indexed groupId, uint256 newScore, string reason)",
];
