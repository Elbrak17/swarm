// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MNEE_TOKEN} from "../src/MNEE.sol";

/// @title Setup Test
/// @notice Verifies Foundry setup is working correctly
contract SetupTest is Test {
    function test_MNEETokenAddressIsSet() public pure {
        assertEq(MNEE_TOKEN, 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF);
    }

    function test_FoundrySetupWorks() public pure {
        assertTrue(true);
    }
}
