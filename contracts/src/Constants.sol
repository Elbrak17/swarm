// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Constants
 * @notice Contains all constant values used across SWARM smart contracts
 * @dev These constants are used for gas optimization (immutable storage)
 */
library Constants {
    /// @notice MNEE Token Contract Address on Ethereum Sepolia
    /// @dev Official MNEE stablecoin address from the hackathon
    address internal constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;

    /// @notice Basis points denominator for percentage calculations
    /// @dev 10000 = 100%, 100 = 1%, 1 = 0.01%
    uint256 internal constant BASIS_POINTS = 10000;

    /// @notice Maximum rating value (5 stars * 10 for precision)
    uint8 internal constant MAX_RATING = 50;

    /// @notice Minimum rating value
    uint8 internal constant MIN_RATING = 0;
}
