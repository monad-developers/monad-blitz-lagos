// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "account-abstraction/interfaces/PackedUserOperation.sol";
import "account-abstraction/interfaces/IEntryPoint.sol";

interface IExecutionMiddleware {
    function processTransaction(address user, uint256 txAmount)
        external view returns (uint256 savingsAmount);
    function commitSavings(address user, uint256 savingsAmount)
        external payable;
}

contract GaslessSmartAccount {

    address public immutable owner;
    address public immutable entryPoint;
    IExecutionMiddleware public immutable middleware;

    // Keyed nonces: key = upper 192 bits, seq = lower 64 bits
    mapping(uint192 => uint64) public nonces;

    event TransactionExecuted(address indexed target, uint256 value, uint256 saved);

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "SA: not entrypoint");
        _;
    }

    constructor(
        address _owner,
        address _entryPoint,
        address _middleware
    ) {
        require(_owner      != address(0), "SA: zero owner");
        require(_entryPoint != address(0), "SA: zero entrypoint");
        require(_middleware != address(0), "SA: zero middleware");

        owner      = _owner;
        entryPoint = _entryPoint;
        middleware = IExecutionMiddleware(_middleware);
    }

    // ─── ERC-4337 v0.7: validateUserOp ───────────────────────────────────

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32                      userOpHash,
        uint256                      missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {

        uint192 key = uint192(userOp.nonce >> 64);
        uint64  seq = uint64(userOp.nonce);
        require(seq == nonces[key], "SA: invalid nonce");
        nonces[key]++;

        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );

        address recovered = recoverSigner(ethHash, userOp.signature);

        if (recovered != owner) {
            return 1; // SIG_VALIDATION_FAILED
        }

        if (missingAccountFunds > 0) {
            IEntryPoint(entryPoint).depositTo{value: missingAccountFunds}(address(this));
        }

        return 0; // SIG_VALIDATION_SUCCESS
    }

    // ─── Core execution ───────────────────────────────────────────────────

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyEntryPoint {

        require(target != address(0), "SA: zero target");

        uint256 savings = middleware.processTransaction(owner, value);
        uint256 netValue = value;

        if (savings > 0 && savings <= value && address(this).balance >= savings) {
            netValue = value - savings;
            middleware.commitSavings{value: savings}(owner, savings);
        }

        (bool ok, ) = target.call{value: netValue}(data);
        require(ok, "SA: execution failed");

        emit TransactionExecuted(target, value, savings);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    function recoverSigner(bytes32 hash, bytes calldata sig)
        internal pure returns (address)
    {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(sig);
        return ecrecover(hash, v, r, s);
    }

    function splitSignature(bytes calldata sig)
        internal pure returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(sig.length == 65, "SA: bad sig length");
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
    }

    function getNonce(uint192 key) external view returns (uint256) {
        return (uint256(key) << 64) | nonces[key];
    }

    receive() external payable {}
}
