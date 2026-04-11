// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IStrategy {
    function deposit(uint256 amount) external payable;
    function withdraw(uint256 amount) external returns (uint256);
    function balanceOf() external view returns (uint256);
}

contract SavingsVault is ReentrancyGuard, Ownable {

    mapping(address => uint256) public balances;
    uint256 public totalDeposits;
    uint256 public totalAllocated;

    address public strategyRouter;
    address public middleware;
    address public batchExecutor;

    bool public paused;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event AllocatedToStrategy(address indexed strategy, uint256 amount);
    event Paused(address by);
    event Unpaused(address by);

    modifier onlyAuthorized() {
        require(
            msg.sender == middleware ||
            msg.sender == batchExecutor ||
            msg.sender == owner(),
            "Vault: unauthorized"
        );
        _;
    }

    modifier notPaused() {
        require(!paused, "Vault: paused");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setMiddleware(address _middleware) external onlyOwner {
        require(_middleware != address(0), "Vault: zero address");
        middleware = _middleware;
    }

    function setBatchExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "Vault: zero address");
        batchExecutor = _executor;
    }

    function setStrategyRouter(address _router) external onlyOwner {
        require(_router != address(0), "Vault: zero address");
        strategyRouter = _router;
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function deposit(address user, uint256 amount)
        external
        payable
        onlyAuthorized
        notPaused
        nonReentrant
    {
        require(amount > 0, "Vault: zero amount");
        require(msg.value == amount, "Vault: value mismatch");

        balances[user] += amount;
        totalDeposits += amount;

        emit Deposited(user, amount);
        _checkInvariant();
    }

    function withdraw(uint256 amount) external notPaused nonReentrant {
        require(balances[msg.sender] >= amount, "Vault: insufficient balance");

        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Vault: transfer failed");

        emit Withdrawn(msg.sender, amount);
        _checkInvariant();
    }

    function allocateToStrategy(address strategy, uint256 amount)
        external
        onlyOwner
        notPaused
        nonReentrant
    {
        require(strategy == strategyRouter, "Vault: use strategyRouter");
        require(address(this).balance >= amount, "Vault: insufficient liquid");

        totalAllocated += amount;
        IStrategy(strategy).deposit{value: amount}(amount);

        emit AllocatedToStrategy(strategy, amount);
        _checkInvariant();
    }

    function _checkInvariant() internal view {
        require(
            totalDeposits == address(this).balance + totalAllocated,
            "Vault: invariant broken"
        );
    }

    function checkInvariant() external view returns (bool) {
        return totalDeposits == address(this).balance + totalAllocated;
    }

    receive() external payable {}
}
