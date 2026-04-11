// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// FIX (C) cascades here: strategy interface deposit must be payable
interface IYieldStrategy {
    function deposit(uint256 amount) external payable;
    function withdraw(uint256 amount) external returns (uint256);
    function balanceOf() external view returns (uint256);
}

contract StrategyRouter is Ownable {

    mapping(address => bool) public approvedStrategies;
    bool public paused;

    event StrategyApproved(address indexed strategy);
    event StrategyRevoked(address indexed strategy);
    event Allocated(address indexed strategy, uint256 amount);
    event EmergencyPaused();
    event Unpaused();

    constructor() Ownable(msg.sender) {}

    modifier notPaused() {
        require(!paused, "Router: paused");
        _;
    }

    function approveStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Router: zero address");
        approvedStrategies[strategy] = true;
        emit StrategyApproved(strategy);
    }

    function revokeStrategy(address strategy) external onlyOwner {
        approvedStrategies[strategy] = false;
        emit StrategyRevoked(strategy);
    }

    function emergencyPause() external onlyOwner {
        paused = true;
        emit EmergencyPaused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function allocate(address strategy, uint256 amount)
        external
        payable
        onlyOwner
        notPaused
    {
        require(approvedStrategies[strategy], "Router: not approved");
        require(msg.value == amount,          "Router: value mismatch");

        IYieldStrategy(strategy).deposit{value: amount}(amount);
        emit Allocated(strategy, amount);
    }

    receive() external payable {}
}