// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "account-abstraction/interfaces/PackedUserOperation.sol";
import "account-abstraction/interfaces/IEntryPoint.sol";
import "account-abstraction/interfaces/IPaymaster.sol";

contract SavingsPaymaster is Ownable, ReentrancyGuard, IPaymaster {

    IEntryPoint public immutable entryPoint;

    // ─── Rate limiting ────────────────────────────────────────────────────
    mapping(address => uint256) public txCountToday;
    mapping(address => uint256) public lastTxDay;
    uint256 public dailyTxLimit = 10;

    // ─── Gas accounting ───────────────────────────────────────────────────
    mapping(address => uint256) public totalGasSponsored;
    uint256 public maxGasPerUser = 0.05 ether;

    event GasSponsored(address indexed user, uint256 actualCost);
    event DailyLimitUpdated(uint256 newLimit);
    event MaxGasPerUserUpdated(uint256 newMax);
    event DepositedToEntryPoint(uint256 amount);
    event StakeAdded(uint256 amount, uint32 delay);

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "Paymaster: not entrypoint");
        _;
    }

    constructor(address _entryPoint) Ownable(msg.sender) {
        require(_entryPoint != address(0), "Paymaster: zero entrypoint");
        entryPoint = IEntryPoint(_entryPoint);
    }

    // ─── IPaymaster: validatePaymasterUserOp ──────────────────────────────

    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 maxCost
    ) external onlyEntryPoint returns (bytes memory context, uint256 validationData) {

        address user = userOp.sender;

        uint256 today = block.timestamp / 1 days;
        if (lastTxDay[user] < today) {
            txCountToday[user] = 0;
            lastTxDay[user] = today;
        }

        if (txCountToday[user] >= dailyTxLimit) {
            return (bytes(""), 1);
        }

        if (totalGasSponsored[user] + maxCost > maxGasPerUser) {
            return (bytes(""), 1);
        }

        if (entryPoint.balanceOf(address(this)) < maxCost) {
            return (bytes(""), 1);
        }

        txCountToday[user]++;

        return (abi.encode(user, maxCost), 0);
    }

    // ─── IPaymaster: postOp ───────────────────────────────────────────────

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 /*actualUserOpFeePerGas*/
    ) external onlyEntryPoint {
        (address user, ) = abi.decode(context, (address, uint256));

        totalGasSponsored[user] += actualGasCost;
        emit GasSponsored(user, actualGasCost);

        // mode == opReverted: user tx reverted but we still paid gas
        // Could implement penalty logic here
        if (mode == PostOpMode.opReverted) {}
    }

    // ─── EntryPoint funding and staking ───────────────────────────────────

    function depositToEntryPoint() external payable onlyOwner {
        entryPoint.depositTo{value: msg.value}(address(this));
        emit DepositedToEntryPoint(msg.value);
    }

    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
        emit StakeAdded(msg.value, unstakeDelaySec);
    }

    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    function withdrawStake(address payable to) external onlyOwner {
        entryPoint.withdrawStake(to);
    }

    function withdrawDeposit(address payable to, uint256 amount)
        external onlyOwner nonReentrant
    {
        entryPoint.withdrawTo(to, amount);
    }

    function entryPointBalance() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function setDailyLimit(uint256 newLimit) external onlyOwner {
        dailyTxLimit = newLimit;
        emit DailyLimitUpdated(newLimit);
    }

    function setMaxGasPerUser(uint256 newMax) external onlyOwner {
        maxGasPerUser = newMax;
        emit MaxGasPerUserUpdated(newMax);
    }

    receive() external payable {}
}
