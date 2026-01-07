// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MNEE Token Interface
/// @notice Interface for the MNEE stablecoin on Ethereum
/// @dev MNEE contract address on mainnet: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
interface IMNEE is IERC20 {
    // MNEE follows standard ERC20 interface
}

// MNEE token address constant for use across contracts
address constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
