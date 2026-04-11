// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IApriori
/// @notice Interface for aPriori liquid staking on Monad
interface IApriori {
    /// @notice Deposit MON and receive stMON
    function deposit(address receiver) external payable returns (uint256 shares);

    /// @notice Redeem stMON for MON
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);

    /// @notice Preview how much MON you get for a given stMON amount
    function previewRedeem(uint256 shares) external view returns (uint256);

    /// @notice Preview how many stMON shares you get for a given MON amount
    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    /// @notice Get stMON balance of an address
    function balanceOf(address account) external view returns (uint256);

    /// @notice Convert stMON shares to MON assets
    function convertToAssets(uint256 shares) external view returns (uint256);
}
