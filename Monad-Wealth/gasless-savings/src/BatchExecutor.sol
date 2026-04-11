// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISavingsVaultBatch {
    function deposit(address user, uint256 amount) external payable;
}

contract BatchExecutor is Ownable, ReentrancyGuard {

    ISavingsVaultBatch public vault;
    uint256 public constant MAX_BATCH_SIZE = 200;

    event BatchDeposited(uint256 userCount, uint256 totalAmount);

    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Batch: zero vault");
        vault = ISavingsVaultBatch(_vault);
    }

    function batchDeposit(
        address[] calldata users,
        uint256[] calldata amounts
    ) external payable onlyOwner nonReentrant {
        require(users.length == amounts.length, "Batch: length mismatch");
        require(users.length > 0,               "Batch: empty");
        require(users.length <= MAX_BATCH_SIZE, "Batch: too large");

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(msg.value == total, "Batch: value mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Batch: zero user");
            vault.deposit{value: amounts[i]}(users[i], amounts[i]);
        }

        emit BatchDeposited(users.length, total);
    }
}
