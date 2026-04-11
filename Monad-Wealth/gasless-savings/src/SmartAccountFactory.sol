// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GaslessSmartAccount.sol";

/**
 * ERC-4337 factory — thirdweb-compatible interface.
 *
 * Thirdweb SDK calls:
 *   getAddress(address admin, bytes memory data) → address
 *   createAccount(address admin, bytes memory data) → address
 *
 * `data` is a bytes-encoded salt (hex string from SDK).
 * We decode it as uint256 for CREATE2.
 */
contract SmartAccountFactory {

    address public immutable entryPoint;
    address public immutable middleware;

    event AccountCreated(address indexed account, address indexed owner, bytes data);

    constructor(address _entryPoint, address _middleware) {
        require(_entryPoint != address(0), "Factory: zero entrypoint");
        require(_middleware != address(0), "Factory: zero middleware");
        entryPoint = _entryPoint;
        middleware = _middleware;
    }

    /**
     * Deploy a GaslessSmartAccount for `admin`.
     * Idempotent — returns existing account if already deployed.
     * @param admin  The owner of the smart account (MetaMask EOA)
     * @param data   Salt bytes (thirdweb passes hex-encoded string)
     */
    function createAccount(address admin, bytes memory data)
        external
        returns (address account)
    {
        address predicted = getAddress(admin, data);

        if (predicted.code.length > 0) {
            return predicted; // already deployed
        }

        bytes32 salt = _toSalt(data);

        GaslessSmartAccount deployed = new GaslessSmartAccount{salt: salt}(
            admin,
            entryPoint,
            middleware
        );

        emit AccountCreated(address(deployed), admin, data);
        return address(deployed);
    }

    /**
     * Predict the deterministic address for a given admin + data.
     * @param admin  The owner address
     * @param data   Salt bytes
     */
    function getAddress(address admin, bytes memory data)
        public
        view
        returns (address)
    {
        bytes32 salt = _toSalt(data);

        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(GaslessSmartAccount).creationCode,
                abi.encode(admin, entryPoint, middleware)
            )
        );

        return address(uint160(uint256(keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                initCodeHash
            )
        ))));
    }

    /// @dev Convert bytes data to a bytes32 salt.
    ///      Empty data → salt 0. Otherwise use keccak256 of data.
    function _toSalt(bytes memory data) internal pure returns (bytes32) {
        if (data.length == 0) return bytes32(0);
        // If data is exactly 32 bytes, use it directly as salt
        if (data.length == 32) {
            bytes32 s;
            assembly { s := mload(add(data, 32)) }
            return s;
        }
        return keccak256(data);
    }
}
