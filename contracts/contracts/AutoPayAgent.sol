// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AutoPayAgent {
    event NativePaymentExecuted(
        bytes32 indexed ruleId,
        address indexed operator,
        address indexed recipient,
        uint256 amount
    );

    event TokenPaymentExecuted(
        bytes32 indexed ruleId,
        address indexed operator,
        address indexed token,
        address recipient,
        uint256 amount
    );

    error InvalidRecipient();
    error InvalidToken();
    error InvalidAmount();
    error NativeTransferFailed();
    error TokenTransferFailed();

    function executeNativePayment(bytes32 ruleId, address payable recipient) external payable {
        if (recipient == address(0)) revert InvalidRecipient();
        if (msg.value == 0) revert InvalidAmount();

        (bool success, ) = recipient.call{value: msg.value}("");
        if (!success) revert NativeTransferFailed();

        emit NativePaymentExecuted(ruleId, msg.sender, recipient, msg.value);
    }

    function executeTokenPayment(
        bytes32 ruleId,
        address token,
        address recipient,
        uint256 amount
    ) external {
        if (token == address(0)) revert InvalidToken();
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        bool success = IERC20(token).transferFrom(msg.sender, recipient, amount);
        if (!success) revert TokenTransferFailed();

        emit TokenPaymentExecuted(ruleId, msg.sender, token, recipient, amount);
    }

    receive() external payable {}
}
