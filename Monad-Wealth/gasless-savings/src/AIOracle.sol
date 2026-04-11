// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IExecutionMiddlewareOracle {
    enum RuleType { ROUNDUP, PERCENTAGE, FIXED }
    function setRuleFor(address user, RuleType ruleType, uint256 value, uint256 minBalance) external;
    function pauseRuleFor(address user) external;
}

/**
 * AIOracle.sol
 *
 * On-chain consent registry + validated relay for AI-computed savings rules.
 *
 * Flow:
 *   1. User calls enableAI() from their smart account → opts in
 *   2. Off-chain AI server computes decision, calls applyDecision() with oracle key
 *   3. AIOracle validates consent + rate-limit, then calls middleware.setRuleFor()
 *   4. User can call disableAI() at any time to revoke
 *
 * Security:
 *   - aiOracleKey is a restricted server wallet with NO fund access
 *   - Hard cap: AI cannot set savings rate above MAX_AI_SAVINGS_BPS (20%)
 *   - ExecutionMiddleware enforces its own caps (defense in depth)
 *   - Rate-limited: max 1 AI update per hour per user
 *   - Consent is per-user and revocable at any time
 */
contract AIOracle is Ownable {

    IExecutionMiddlewareOracle public middleware;

    // The off-chain AI server wallet — can only call applyDecision()
    address public aiOracleKey;

    // Per-user AI consent
    mapping(address => bool) public aiEnabled;

    // Rate-limit: last AI update timestamp per user
    mapping(address => uint256) public lastAIUpdate;

    uint256 public constant MIN_UPDATE_INTERVAL = 1 hours;
    uint256 public constant MAX_AI_SAVINGS_BPS  = 2000; // 20% hard cap

    event AIEnabled(address indexed user);
    event AIDisabled(address indexed user);
    event AIDecisionApplied(address indexed user, uint256 savingsRateBps, bool paused);
    event OracleKeyUpdated(address indexed newKey);

    modifier onlyOracle() {
        require(msg.sender == aiOracleKey, "Oracle: not AI key");
        _;
    }

    constructor(address _middleware, address _aiOracleKey) Ownable(msg.sender) {
        require(_middleware  != address(0), "Oracle: zero middleware");
        require(_aiOracleKey != address(0), "Oracle: zero oracle key");
        middleware  = IExecutionMiddlewareOracle(_middleware);
        aiOracleKey = _aiOracleKey;
    }

    // ─── User consent ─────────────────────────────────────────────────────

    /// @notice Opt into AI-managed savings. Call from your smart account.
    function enableAI() external {
        aiEnabled[msg.sender] = true;
        emit AIEnabled(msg.sender);
    }

    /// @notice Revoke AI control. Your existing rule stays active.
    function disableAI() external {
        aiEnabled[msg.sender] = false;
        emit AIDisabled(msg.sender);
    }

    // ─── AI oracle: apply decision ────────────────────────────────────────

    /**
     * @notice Called by the off-chain AI server to push a computed decision.
     * @param user           Smart account address of the user
     * @param savingsRateBps Computed savings rate in basis points (1 bps = 0.01%)
     * @param pause          If true, pause the user's rule instead of updating it
     */
    function applyDecision(
        address user,
        uint256 savingsRateBps,
        bool    pause
    ) external onlyOracle {
        require(aiEnabled[user], "Oracle: user has not enabled AI");
        require(
            block.timestamp >= lastAIUpdate[user] + MIN_UPDATE_INTERVAL,
            "Oracle: update too frequent"
        );

        // CEI: update state before external call
        lastAIUpdate[user] = block.timestamp;

        if (pause) {
            middleware.pauseRuleFor(user);
        } else {
            uint256 safeBps = savingsRateBps > MAX_AI_SAVINGS_BPS
                ? MAX_AI_SAVINGS_BPS
                : savingsRateBps;
            // RuleType.PERCENTAGE = 1, minBalance = 0 (AI manages liquidity off-chain)
            middleware.setRuleFor(
                user,
                IExecutionMiddlewareOracle.RuleType.PERCENTAGE,
                safeBps,
                0
            );
        }

        emit AIDecisionApplied(user, savingsRateBps, pause);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function updateOracleKey(address newKey) external onlyOwner {
        require(newKey != address(0), "Oracle: zero key");
        aiOracleKey = newKey;
        emit OracleKeyUpdated(newKey);
    }

    function updateMiddleware(address newMiddleware) external onlyOwner {
        require(newMiddleware != address(0), "Oracle: zero middleware");
        middleware = IExecutionMiddlewareOracle(newMiddleware);
    }
}
