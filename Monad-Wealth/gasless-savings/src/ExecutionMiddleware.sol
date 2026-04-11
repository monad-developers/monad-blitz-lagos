// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ISavingsVault {
    function deposit(address user, uint256 amount) external payable;
}

contract ExecutionMiddleware is Ownable {

    // ─── Rule Types ──────────────────────────────────────────────────────
    enum RuleType { ROUNDUP, PERCENTAGE, FIXED }

    struct Rule {
        RuleType ruleType;
        uint256  value;       // roundup unit | percentage bps | fixed amount
        uint256  minBalance;  // pause saving if user's balance below this
        bool     active;
    }

    // ─── State ───────────────────────────────────────────────────────────
    mapping(address => Rule) public userRules;
    ISavingsVault public vault;

    // AI oracle address — set by owner, can call setRuleFor / pauseRuleFor
    address public aiOracle;

    uint256 public constant MIN_SAVINGS        = 100 wei;
    uint256 public constant MAX_PERCENTAGE_BPS = 3000; // 30%

    event SavingsCalculated(address indexed user, uint256 txAmount, uint256 savings);
    event RuleSet(address indexed user, RuleType ruleType, uint256 value);
    event RulePaused(address indexed user);
    event AIRuleSet(address indexed user, RuleType ruleType, uint256 value);
    event AIRulePaused(address indexed user);
    event AIOracleUpdated(address indexed newOracle);

    modifier onlyAIOracle() {
        require(msg.sender == aiOracle, "MW: not AI oracle");
        _;
    }

    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "MW: zero vault");
        vault = ISavingsVault(_vault);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function setAIOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "MW: zero oracle");
        aiOracle = _oracle;
        emit AIOracleUpdated(_oracle);
    }

    // ─── Rule Management (user-initiated) ────────────────────────────────

    function setRule(
        RuleType ruleType,
        uint256  value,
        uint256  minBalance
    ) external {
        if (ruleType == RuleType.PERCENTAGE) {
            require(value <= MAX_PERCENTAGE_BPS, "MW: exceeds max %");
        }
        if (ruleType == RuleType.ROUNDUP) {
            require(value > 0, "MW: roundup unit must be > 0");
        }
        userRules[msg.sender] = Rule(ruleType, value, minBalance, true);
        emit RuleSet(msg.sender, ruleType, value);
    }

    function pauseRule() external {
        userRules[msg.sender].active = false;
        emit RulePaused(msg.sender);
    }

    // ─── Rule Management (AI oracle-initiated) ────────────────────────────

    /// @notice Called by the AIOracle contract to update a user's rule.
    ///         User must have opted in via AIOracle.enableAI().
    function setRuleFor(
        address  user,
        RuleType ruleType,
        uint256  value,
        uint256  minBalance
    ) external onlyAIOracle {
        if (ruleType == RuleType.PERCENTAGE) {
            require(value <= MAX_PERCENTAGE_BPS, "MW: exceeds max %");
        }
        if (ruleType == RuleType.ROUNDUP) {
            require(value > 0, "MW: roundup unit must be > 0");
        }
        userRules[user] = Rule(ruleType, value, minBalance, true);
        emit AIRuleSet(user, ruleType, value);
    }

    /// @notice Called by the AIOracle contract to pause a user's rule.
    function pauseRuleFor(address user) external onlyAIOracle {
        userRules[user].active = false;
        emit AIRulePaused(user);
    }

    // ─── Pure Calculation (no state changes, no external calls) ──────────
    // Called by GaslessSmartAccount.execute() to determine how much to save.
    // Must remain view-only — EntryPoint simulation calls this path.

    function processTransaction(address user, uint256 txAmount)
        external
        view
        returns (uint256 savingsAmount)
    {
        Rule memory rule = userRules[user];
        if (!rule.active) return 0;

        // FIX (A): was `ruleType` (undefined var) — corrected to `rule.ruleType`
        if (rule.ruleType == RuleType.ROUNDUP) {
            uint256 remainder = txAmount % rule.value;
            savingsAmount = remainder == 0 ? 0 : rule.value - remainder;

        } else if (rule.ruleType == RuleType.PERCENTAGE) {
            savingsAmount = (txAmount * rule.value) / 10_000;

        } else if (rule.ruleType == RuleType.FIXED) {
            savingsAmount = rule.value;
        }

        // Enforce minimum to prevent spam
        if (savingsAmount < MIN_SAVINGS) return 0;

        // Never save more than the transaction amount
        if (savingsAmount > txAmount) return 0;
    }

    // ─── Effectful Commit (state change — called after pure calculation) ─
    // Smart account calls this AFTER processTransaction(), forwarding exact ETH.
    // Separation of pure calc vs. effectful commit is intentional (CEI discipline).

    function commitSavings(address user, uint256 savingsAmount)
        external
        payable
    {
        require(msg.value == savingsAmount, "MW: value mismatch");
        require(savingsAmount >= MIN_SAVINGS,  "MW: below minimum");

        emit SavingsCalculated(user, msg.value, savingsAmount);

        // Forward ETH to vault
        vault.deposit{value: savingsAmount}(user, savingsAmount);
    }
}