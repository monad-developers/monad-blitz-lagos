// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IApriori.sol";

/// @title AjoChain
/// @notice Autonomous rotating savings protocol on Monad
contract AjoChain {
    // ─────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────

    enum GroupStatus { Forming, Active, Completed, Cancelled }
    enum FundStatus  { Idle, Deployed }

    struct Member {
        address wallet;
        bool    hasPaid;              // current round payment
        bool    hasCollateral;        // collateral locked
        bool    hasReceivedPayout;    // has taken their turn as winner
        uint256 creditScore;          // starts at 100, decreases on default
        uint8   defaultCount;
    }

    struct Group {
        uint256     id;
        uint256     contributionAmount; // per member per round (in MON, wei)
        uint256     collateralAmount;   // required collateral per member
        uint8       totalMembers;
        uint8       currentRound;       // 1-indexed
        uint8       paidCount;          // members who paid this round
        uint256     roundDeadline;      // unix timestamp
        uint256     roundDuration;      // seconds between rounds
        address[]   memberAddresses;
        mapping(address => Member) members;
        GroupStatus status;
        FundStatus  fundStatus;
        uint256     stMonShares;        // stMON held when deployed to aPriori
        uint256     yieldEarned;        // total yield accumulated by group
        uint256     createdAt;
    }

    // ─────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────

    IApriori public immutable apriori;
    address  public immutable agent;   // only address allowed to call treasurer functions

    uint256 public groupCount;
    mapping(uint256 => Group) private groups;

    // Track which groups a wallet is in
    mapping(address => uint256[]) public memberGroups;

    // Intent registration for matchmaking
    struct Intent {
        address wallet;
        uint256 contributionAmount;
        uint8   desiredGroupSize;
        uint256 roundDuration;
        bool    matched;
    }
    uint256 public intentCount;
    mapping(uint256 => Intent) public intents;
    mapping(address => uint256) public walletIntent; // wallet → intent ID (0 = none)

    // ─────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────

    event IntentRegistered(uint256 indexed intentId, address indexed wallet, uint256 amount, uint8 groupSize, uint256 roundDuration);
    event GroupCreated(uint256 indexed groupId, address[] members, uint256 contributionAmount, uint256 roundDuration);
    event CollateralLocked(uint256 indexed groupId, address indexed member);
    event GroupActivated(uint256 indexed groupId);
    event ContributionPaid(uint256 indexed groupId, uint8 round, address indexed member);
    event RoundAdvanced(uint256 indexed groupId, uint8 newRound, address indexed winner, uint256 payout);
    event FundsDeployedToYield(uint256 indexed groupId, uint256 monAmount, uint256 sharesReceived);
    event FundsWithdrawnFromYield(uint256 indexed groupId, uint256 sharesRedeemed, uint256 monReturned);
    event SecurityDepositReturned(uint256 indexed groupId, address indexed member, uint256 amount);
    event CollateralSlashed(uint256 indexed groupId, address indexed defaulter, uint256 amount, string reason);
    event MemberDefaulted(uint256 indexed groupId, uint8 round, address indexed defaulter);
    event GroupCompleted(uint256 indexed groupId);
    event CreditScoreUpdated(address indexed wallet, uint256 indexed groupId, uint256 newScore, string reason);

    // ─────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────

    error OnlyAgent();
    error AlreadyHasIntent();
    error InvalidAmount();
    error GroupNotForming();
    error GroupNotActive();
    error AlreadyPaid();
    error NotMember();
    error CollateralNotLocked();
    error AlreadyHasCollateral();
    error WrongCollateralAmount();
    error WrongContributionAmount();
    error RoundDeadlineNotPassed();
    error FundsAlreadyDeployed();
    error FundsNotDeployed();
    error GroupAlreadyActivated();
    error NotAllCollateralLocked();
    error IntentAlreadyMatched();

    // ─────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    modifier onlyMember(uint256 groupId) {
        if (groups[groupId].members[msg.sender].wallet == address(0)) revert NotMember();
        _;
    }

    // ─────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────

    constructor(address _apriori, address _agent) {
        apriori = IApriori(_apriori);
        agent   = _agent;
    }

    // ─────────────────────────────────────────────────
    // Intent Registration (users)
    // ─────────────────────────────────────────────────

    /// @notice User registers their savings intent for AI matchmaking
    function registerIntent(
        uint256 contributionAmount,
        uint8   desiredGroupSize,
        uint256 roundDuration
    ) external {
        if (contributionAmount == 0) revert InvalidAmount();
        if (walletIntent[msg.sender] != 0) revert AlreadyHasIntent();

        intentCount++;
        intents[intentCount] = Intent({
            wallet:             msg.sender,
            contributionAmount: contributionAmount,
            desiredGroupSize:   desiredGroupSize,
            roundDuration:      roundDuration,
            matched:            false
        });
        walletIntent[msg.sender] = intentCount;

        emit IntentRegistered(intentCount, msg.sender, contributionAmount, desiredGroupSize, roundDuration);
    }

    // ─────────────────────────────────────────────────
    // Group Creation (agent)
    // ─────────────────────────────────────────────────

    /// @notice Agent creates a group from matched intents
    function createGroup(
        address[] calldata memberWallets,
        uint256 contributionAmount,
        uint256 roundDuration
    ) external onlyAgent returns (uint256 groupId) {
        groupCount++;
        groupId = groupCount;

        Group storage g = groups[groupId];
        g.id                 = groupId;
        g.contributionAmount = contributionAmount;
        g.collateralAmount   = contributionAmount * 2; // 2x contribution as collateral
        g.totalMembers       = uint8(memberWallets.length);
        g.currentRound       = 0;
        g.roundDuration      = roundDuration;
        g.status             = GroupStatus.Forming;
        g.fundStatus         = FundStatus.Idle;
        g.createdAt          = block.timestamp;

        for (uint256 i = 0; i < memberWallets.length; i++) {
            address w = memberWallets[i];
            g.memberAddresses.push(w);
            g.members[w] = Member({
                wallet:            w,
                hasPaid:           false,
                hasCollateral:     false,
                hasReceivedPayout: false,
                creditScore:       100,
                defaultCount:      0
            });
            memberGroups[w].push(groupId);

            // Mark their intent as matched
            uint256 intentId = walletIntent[w];
            if (intentId != 0) {
                if (intents[intentId].matched) revert IntentAlreadyMatched();
                intents[intentId].matched = true;
            }
        }

        emit GroupCreated(groupId, memberWallets, contributionAmount, roundDuration);
    }

    // ─────────────────────────────────────────────────
    // Collateral (members)
    // ─────────────────────────────────────────────────

    /// @notice Member locks their collateral to join the group
    function lockCollateral(uint256 groupId) external payable onlyMember(groupId) {
        Group storage g = groups[groupId];
        if (g.status != GroupStatus.Forming) revert GroupNotForming();

        Member storage m = g.members[msg.sender];
        if (m.hasCollateral) revert AlreadyHasCollateral();
        if (msg.value != g.collateralAmount) revert WrongCollateralAmount();

        m.hasCollateral = true;
        emit CollateralLocked(groupId, msg.sender);

        // Check if all members have locked collateral
        bool allLocked = true;
        for (uint256 i = 0; i < g.memberAddresses.length; i++) {
            if (!g.members[g.memberAddresses[i]].hasCollateral) {
                allLocked = false;
                break;
            }
        }

        if (allLocked) {
            _activateGroup(groupId);
        }
    }

    function _activateGroup(uint256 groupId) internal {
        Group storage g = groups[groupId];
        g.status       = GroupStatus.Active;
        g.currentRound = 1;
        g.roundDeadline = block.timestamp + g.roundDuration;
        emit GroupActivated(groupId);
    }

    // ─────────────────────────────────────────────────
    // Contributions (members)
    // ─────────────────────────────────────────────────

    /// @notice Member pays their contribution for the current round
    function payContribution(uint256 groupId) external payable onlyMember(groupId) {
        Group storage g = groups[groupId];
        if (g.status != GroupStatus.Active) revert GroupNotActive();

        Member storage m = g.members[msg.sender];
        if (!m.hasCollateral) revert CollateralNotLocked();
        if (m.hasPaid) revert AlreadyPaid();
        if (msg.value != g.contributionAmount) revert WrongContributionAmount();

        m.hasPaid = true;
        g.paidCount++;

        emit ContributionPaid(groupId, g.currentRound, msg.sender);
    }

    // ─────────────────────────────────────────────────
    // Yield Management (agent)
    // ─────────────────────────────────────────────────

    /// @notice Agent deploys idle group funds to aPriori for yield
    function deployToYield(uint256 groupId) external onlyAgent {
        Group storage g = groups[groupId];
        if (g.status != GroupStatus.Active) revert GroupNotActive();
        if (g.fundStatus == FundStatus.Deployed) revert FundsAlreadyDeployed();

        // Only deploy what members have contributed this round (not collateral)
        uint256 idleFunds = uint256(g.paidCount) * g.contributionAmount;
        if (idleFunds == 0) revert InvalidAmount();

        uint256 shares = apriori.deposit{value: idleFunds}(address(this));
        g.stMonShares = shares;
        g.fundStatus  = FundStatus.Deployed;

        emit FundsDeployedToYield(groupId, idleFunds, shares);
    }

    /// @notice Agent withdraws group funds from aPriori before payout
    function withdrawFromYield(uint256 groupId) external onlyAgent {
        Group storage g = groups[groupId];
        if (g.status != GroupStatus.Active) revert GroupNotActive();
        if (g.fundStatus != FundStatus.Deployed) revert FundsNotDeployed();

        uint256 shares = g.stMonShares;
        uint256 monBefore = address(this).balance;

        apriori.redeem(shares, address(this), address(this));

        uint256 monAfter = address(this).balance;
        uint256 returned = monAfter - monBefore;
        uint256 principal = uint256(g.paidCount) * g.contributionAmount;
        uint256 yield = returned > principal ? returned - principal : 0;

        g.stMonShares = 0;
        g.fundStatus  = FundStatus.Idle;
        g.yieldEarned += yield;

        emit FundsWithdrawnFromYield(groupId, shares, returned);
    }

    // ─────────────────────────────────────────────────
    // Round Advancement (agent)
    // ─────────────────────────────────────────────────

    /// @notice Agent advances the round and pays the winner
    /// @param groupId The group
    /// @param winner  The address selected to receive this round's payout
    function advanceRound(uint256 groupId, address winner) external onlyAgent {
        Group storage g = groups[groupId];
        if (g.status != GroupStatus.Active) revert GroupNotActive();
        if (g.fundStatus == FundStatus.Deployed) revert FundsAlreadyDeployed();

        // Winner gets contributions from all paying members + their share of yield
        uint256 payout = uint256(g.paidCount) * g.contributionAmount;
        if (g.yieldEarned > 0) {
            payout += g.yieldEarned;
            g.yieldEarned = 0;
        }

        uint8 roundJustCompleted = g.currentRound;

        // Reset payment state for next round
        for (uint256 i = 0; i < g.memberAddresses.length; i++) {
            g.members[g.memberAddresses[i]].hasPaid = false;
        }
        g.paidCount = 0;

        // Mark winner and pay
        g.members[winner].hasReceivedPayout = true;
        payable(winner).transfer(payout);
        emit RoundAdvanced(groupId, g.currentRound, winner, payout);

        // Check if this was the last round
        if (roundJustCompleted == g.totalMembers) {
            g.status = GroupStatus.Completed;
            emit GroupCompleted(groupId);
            _returnSecurityDeposits(groupId);
        } else {
            g.currentRound++;
            g.roundDeadline = block.timestamp + g.roundDuration;
        }
    }

    // ─────────────────────────────────────────────────
    // Default Handling (agent)
    // ─────────────────────────────────────────────────

    /// @notice Agent slashes a defaulting member's collateral
    /// @param groupId   The group
    /// @param defaulter The member who defaulted
    /// @param winner    The round winner who must still be paid
    /// @param reason    Agent's logged reasoning for the slash
    function handleDefault(
        uint256 groupId,
        address defaulter,
        address winner,
        string calldata reason
    ) external onlyAgent {
        Group storage g = groups[groupId];
        if (g.status != GroupStatus.Active) revert GroupNotActive();

        Member storage dm = g.members[defaulter];
        if (!dm.hasCollateral) revert CollateralNotLocked();

        uint256 slashAmount = g.collateralAmount;
        dm.hasCollateral = false;
        dm.defaultCount++;

        // Reduce credit score — heavier penalty for repeat offenders
        uint256 penalty = dm.defaultCount == 1 ? 20 : 40;
        dm.creditScore = dm.creditScore > penalty ? dm.creditScore - penalty : 0;

        emit CollateralSlashed(groupId, defaulter, slashAmount, reason);
        emit MemberDefaulted(groupId, g.currentRound, defaulter);
        emit CreditScoreUpdated(defaulter, groupId, dm.creditScore, reason);

        // Use slashed collateral to cover the round payout
        uint256 payout = uint256(g.paidCount) * g.contributionAmount + slashAmount;

        // Reset for next round
        for (uint256 i = 0; i < g.memberAddresses.length; i++) {
            g.members[g.memberAddresses[i]].hasPaid = false;
        }
        g.paidCount = 0;

        payable(winner).transfer(payout);
        emit RoundAdvanced(groupId, g.currentRound, winner, payout);

        if (g.currentRound == g.totalMembers) {
            g.status = GroupStatus.Completed;
            emit GroupCompleted(groupId);
            _returnSecurityDeposits(groupId);
        } else {
            g.currentRound++;
            g.roundDeadline = block.timestamp + g.roundDuration;
        }
    }

    // ─────────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────────

    /// @notice Returns security deposits to all members who didn't default
    function _returnSecurityDeposits(uint256 groupId) internal {
        Group storage g = groups[groupId];
        for (uint256 i = 0; i < g.memberAddresses.length; i++) {
            address memberAddr = g.memberAddresses[i];
            Member storage m = g.members[memberAddr];
            if (m.hasCollateral) {
                m.hasCollateral = false;
                payable(memberAddr).transfer(g.collateralAmount);
                emit SecurityDepositReturned(groupId, memberAddr, g.collateralAmount);
            }
        }
    }

    // ─────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────

    struct GroupView {
        uint256     id;
        uint256     contributionAmount;
        uint256     collateralAmount;
        uint8       totalMembers;
        uint8       currentRound;
        uint8       paidCount;
        uint256     roundDeadline;
        uint256     roundDuration;
        GroupStatus status;
        FundStatus  fundStatus;
        uint256     stMonShares;
        uint256     yieldEarned;
        uint256     createdAt;
        address[]   memberAddresses;
    }

    struct MemberView {
        address wallet;
        bool    hasPaid;
        bool    hasCollateral;
        bool    hasReceivedPayout;
        uint256 creditScore;
        uint8   defaultCount;
    }

    function getGroup(uint256 groupId) external view returns (GroupView memory) {
        Group storage g = groups[groupId];
        return GroupView({
            id:                 g.id,
            contributionAmount: g.contributionAmount,
            collateralAmount:   g.collateralAmount,
            totalMembers:       g.totalMembers,
            currentRound:       g.currentRound,
            paidCount:          g.paidCount,
            roundDeadline:      g.roundDeadline,
            roundDuration:      g.roundDuration,
            status:             g.status,
            fundStatus:         g.fundStatus,
            stMonShares:        g.stMonShares,
            yieldEarned:        g.yieldEarned,
            createdAt:          g.createdAt,
            memberAddresses:    g.memberAddresses
        });
    }

    function getMember(uint256 groupId, address wallet) external view returns (MemberView memory) {
        Member storage m = groups[groupId].members[wallet];
        return MemberView({
            wallet:            m.wallet,
            hasPaid:           m.hasPaid,
            hasCollateral:     m.hasCollateral,
            hasReceivedPayout: m.hasReceivedPayout,
            creditScore:       m.creditScore,
            defaultCount:      m.defaultCount
        });
    }

    function getGroupMembers(uint256 groupId) external view returns (MemberView[] memory) {
        Group storage g = groups[groupId];
        MemberView[] memory members = new MemberView[](g.memberAddresses.length);
        for (uint256 i = 0; i < g.memberAddresses.length; i++) {
            Member storage m = g.members[g.memberAddresses[i]];
            members[i] = MemberView({
                wallet:            m.wallet,
                hasPaid:           m.hasPaid,
                hasCollateral:     m.hasCollateral,
                hasReceivedPayout: m.hasReceivedPayout,
                creditScore:       m.creditScore,
                defaultCount:      m.defaultCount
            });
        }
        return members;
    }

    function getMemberGroups(address wallet) external view returns (uint256[] memory) {
        return memberGroups[wallet];
    }

    function getIdleFunds(uint256 groupId) external view returns (uint256) {
        Group storage g = groups[groupId];
        if (g.fundStatus == FundStatus.Deployed) return 0;
        return uint256(g.paidCount) * g.contributionAmount;
    }

    function getAllActiveGroups() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= groupCount; i++) {
            if (groups[i].status == GroupStatus.Active) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= groupCount; i++) {
            if (groups[i].status == GroupStatus.Active) result[idx++] = i;
        }
        return result;
    }

    function getAllIntents() external view returns (Intent[] memory) {
        Intent[] memory result = new Intent[](intentCount);
        for (uint256 i = 1; i <= intentCount; i++) {
            result[i - 1] = intents[i];
        }
        return result;
    }

    /// @notice Receive MON (needed for aPriori withdrawals landing back here)
    receive() external payable {}
}
