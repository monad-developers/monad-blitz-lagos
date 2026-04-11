// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Testnet-only mock yield strategy.
 * Holds deposited ETH and returns it on withdraw.
 * Swap this out for a real Aave/Compound adapter in production.
 */
contract MockStrategy {

    mapping(address => uint256) public deposited;

    event Deposited(address indexed caller, uint256 amount);
    event Withdrawn(address indexed caller, uint256 amount);

    function deposit(uint256 amount) external payable {
        require(msg.value == amount, "Mock: value mismatch");
        deposited[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external returns (uint256) {
        require(deposited[msg.sender] >= amount, "Mock: insufficient");
        deposited[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Mock: transfer failed");
        emit Withdrawn(msg.sender, amount);
        return amount;
    }

    function balanceOf() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
