// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentPayments} from "../src/AgentPayments.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Mock MNEE Token for testing
contract MockMNEE is ERC20 {
    constructor() ERC20("Mock MNEE", "MNEE") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title AgentPayments Unit Tests
contract AgentPaymentsTest is Test {
    AgentPayments public payments;
    MockMNEE public mnee;

    address public payer = address(0x1);
    address public agent1 = address(0x10);
    address public agent2 = address(0x20);
    address public agent3 = address(0x30);
    bytes32 public swarmId = keccak256("testSwarm");

    uint256 public constant TOTAL_PAYMENT = 10000 * 10**18;

    function setUp() public {
        mnee = new MockMNEE();
        payments = new AgentPayments(address(mnee));

        // Fund payer with MNEE
        mnee.mint(payer, 1_000_000 * 10**18);
    }

    // ============ distributePayment Tests ============

    function test_DistributePayment_EqualShares() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000; // 50%
        shares[1] = 5000; // 50%

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();

        // Each agent should receive 50%
        assertEq(mnee.balanceOf(agent1), TOTAL_PAYMENT / 2);
        assertEq(mnee.balanceOf(agent2), TOTAL_PAYMENT / 2);
    }

    function test_DistributePayment_UnequalShares() public {
        address[] memory agents = new address[](3);
        agents[0] = agent1;
        agents[1] = agent2;
        agents[2] = agent3;

        uint256[] memory shares = new uint256[](3);
        shares[0] = 5000; // 50%
        shares[1] = 3000; // 30%
        shares[2] = 2000; // 20%

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();

        assertEq(mnee.balanceOf(agent1), (TOTAL_PAYMENT * 5000) / 10000);
        assertEq(mnee.balanceOf(agent2), (TOTAL_PAYMENT * 3000) / 10000);
        assertEq(mnee.balanceOf(agent3), (TOTAL_PAYMENT * 2000) / 10000);
    }

    function test_DistributePayment_EmitsEvent() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 6000;
        shares[1] = 4000;

        uint256[] memory expectedAmounts = new uint256[](2);
        expectedAmounts[0] = (TOTAL_PAYMENT * 6000) / 10000;
        expectedAmounts[1] = (TOTAL_PAYMENT * 4000) / 10000;

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);

        vm.expectEmit(true, false, false, true);
        emit AgentPayments.PaymentDistributed(swarmId, agents, expectedAmounts, TOTAL_PAYMENT);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();
    }

    function test_DistributePayment_SingleAgent() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000; // 100%

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();

        assertEq(mnee.balanceOf(agent1), TOTAL_PAYMENT);
    }

    function test_DistributePayment_HandlesDust() public {
        // Use an amount that doesn't divide evenly
        uint256 oddAmount = 10001 * 10**18;

        address[] memory agents = new address[](3);
        agents[0] = agent1;
        agents[1] = agent2;
        agents[2] = agent3;

        uint256[] memory shares = new uint256[](3);
        shares[0] = 3333;
        shares[1] = 3333;
        shares[2] = 3334; // Total = 10000

        vm.startPrank(payer);
        mnee.approve(address(payments), oddAmount);
        payments.distributePayment(swarmId, agents, shares, oddAmount);
        vm.stopPrank();

        // Total distributed should equal total amount
        uint256 totalDistributed = mnee.balanceOf(agent1) + mnee.balanceOf(agent2) + mnee.balanceOf(agent3);
        assertEq(totalDistributed, oddAmount);
    }

    function test_DistributePayment_RevertsOnArrayMismatch() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint256[] memory shares = new uint256[](3);
        shares[0] = 3000;
        shares[1] = 3000;
        shares[2] = 4000;

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);

        vm.expectRevert(AgentPayments.ArrayLengthMismatch.selector);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();
    }

    function test_DistributePayment_RevertsOnEmptyAgents() public {
        address[] memory agents = new address[](0);
        uint256[] memory shares = new uint256[](0);

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);

        vm.expectRevert(AgentPayments.EmptyAgents.selector);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();
    }

    function test_DistributePayment_RevertsOnZeroAmount() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(payer);
        vm.expectRevert(AgentPayments.ZeroTotalAmount.selector);
        payments.distributePayment(swarmId, agents, shares, 0);
    }

    function test_DistributePayment_RevertsOnInvalidShares() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000;
        shares[1] = 4000; // Total = 9000, not 10000

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);

        vm.expectRevert(AgentPayments.InvalidShares.selector);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();
    }

    function test_DistributePayment_RevertsOnExcessiveShares() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 6000;
        shares[1] = 5000; // Total = 11000, exceeds 10000

        vm.startPrank(payer);
        mnee.approve(address(payments), TOTAL_PAYMENT);

        vm.expectRevert(AgentPayments.InvalidShares.selector);
        payments.distributePayment(swarmId, agents, shares, TOTAL_PAYMENT);
        vm.stopPrank();
    }

    // ============ calculatePayments Tests ============

    function test_CalculatePayments() public view {
        uint256[] memory shares = new uint256[](3);
        shares[0] = 5000;
        shares[1] = 3000;
        shares[2] = 2000;

        uint256[] memory amounts = payments.calculatePayments(shares, TOTAL_PAYMENT);

        assertEq(amounts[0], (TOTAL_PAYMENT * 5000) / 10000);
        assertEq(amounts[1], (TOTAL_PAYMENT * 3000) / 10000);
        assertEq(amounts[2], (TOTAL_PAYMENT * 2000) / 10000);
    }

    // ============ validateShares Tests ============

    function test_ValidateShares_Valid() public view {
        uint256[] memory shares = new uint256[](3);
        shares[0] = 5000;
        shares[1] = 3000;
        shares[2] = 2000;

        assertTrue(payments.validateShares(shares));
    }

    function test_ValidateShares_Invalid() public view {
        uint256[] memory shares = new uint256[](2);
        shares[0] = 5000;
        shares[1] = 4000; // Total = 9000

        assertFalse(payments.validateShares(shares));
    }

    function test_ValidateShares_SingleAgent() public view {
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        assertTrue(payments.validateShares(shares));
    }
}

/// @title AgentPayments Property-Based Tests
/// @notice Fuzz tests validating correctness properties from design document
contract AgentPaymentsPropertyTest is Test {
    AgentPayments public payments;
    MockMNEE public mnee;

    address public payer = address(0x1);
    bytes32 public swarmId = keccak256("testSwarm");

    uint256 public constant MAX_AGENTS = 10;
    uint256 public constant MAX_TOTAL_AMOUNT = 1_000_000 * 10**18;
    uint256 public constant BASIS_POINTS = 10000;

    function setUp() public {
        mnee = new MockMNEE();
        payments = new AgentPayments(address(mnee));

        // Fund payer with large amount of MNEE
        mnee.mint(payer, 100_000_000 * 10**18);
    }

    // ============ Helper Functions ============

    /// @notice Generate valid agent addresses from seed
    function _generateAgents(uint256 seed, uint256 count) internal pure returns (address[] memory) {
        address[] memory agents = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            // Generate unique non-zero addresses
            agents[i] = address(uint160(uint256(keccak256(abi.encodePacked(seed, i))) % type(uint160).max));
            if (agents[i] == address(0)) {
                agents[i] = address(uint160(i + 1));
            }
        }
        return agents;
    }

    /// @notice Generate valid shares that sum to BASIS_POINTS
    function _generateValidShares(uint256 seed, uint256 count) internal pure returns (uint256[] memory) {
        uint256[] memory shares = new uint256[](count);
        uint256 remaining = BASIS_POINTS;

        for (uint256 i = 0; i < count - 1; i++) {
            // Generate a share between 1 and remaining - (count - i - 1)
            uint256 maxShare = remaining - (count - i - 1);
            uint256 share = (uint256(keccak256(abi.encodePacked(seed, i))) % maxShare) + 1;
            shares[i] = share;
            remaining -= share;
        }
        // Last agent gets the remainder
        shares[count - 1] = remaining;

        return shares;
    }

    // ============ Property 13: Payment Distribution Matches Shares ============
    /// @dev Feature: swarm-marketplace, Property 13: Payment distribution matches shares
    /// @notice For any payment distribution with total amount T and shares array S,
    ///         each agent i SHALL receive (T * S[i]) / sum(S), and the sum of all
    ///         agent payments SHALL equal T (accounting for rounding).

    function testFuzz_Property13_PaymentDistributionMatchesShares(
        uint256 seed,
        uint8 agentCount,
        uint256 totalAmount
    ) public {
        // Bound inputs to reasonable ranges
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);

        // Generate valid agents and shares
        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, agentCount);

        // Record initial balances
        uint256[] memory initialBalances = new uint256[](agentCount);
        for (uint256 i = 0; i < agentCount; i++) {
            initialBalances[i] = mnee.balanceOf(agents[i]);
        }

        // Execute distribution
        vm.startPrank(payer);
        mnee.approve(address(payments), totalAmount);
        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();

        // Verify each agent received correct share (within rounding tolerance)
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < agentCount; i++) {
            uint256 received = mnee.balanceOf(agents[i]) - initialBalances[i];
            uint256 expectedBase = (totalAmount * shares[i]) / BASIS_POINTS;

            // Agent should receive at least their base share
            assertGe(received, expectedBase, "Agent received less than expected base share");

            // Agent should receive at most base share + dust (dust only goes to first agent)
            if (i == 0) {
                // First agent may receive dust
                assertLe(received, expectedBase + agentCount, "First agent received too much");
            } else {
                assertEq(received, expectedBase, "Non-first agent received unexpected amount");
            }

            totalDistributed += received;
        }

        // Total distributed must equal total amount (no funds lost)
        assertEq(totalDistributed, totalAmount, "Total distributed does not match total amount");
    }

    // ============ Property 14: Invalid Share Sums Are Rejected ============
    /// @dev Feature: swarm-marketplace, Property 14: Invalid share sums are rejected
    /// @notice For any payment distribution where the agents array length does not
    ///         match the shares array length, the transaction SHALL revert.

    function testFuzz_Property14_ArrayLengthMismatchReverts(
        uint256 seed,
        uint8 agentCount,
        uint8 shareCount,
        uint256 totalAmount
    ) public {
        // Ensure counts are different and non-zero
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));
        shareCount = uint8(bound(shareCount, 1, MAX_AGENTS));
        vm.assume(agentCount != shareCount);
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);

        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, shareCount);

        vm.startPrank(payer);
        mnee.approve(address(payments), totalAmount);

        vm.expectRevert(AgentPayments.ArrayLengthMismatch.selector);
        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();
    }

    /// @dev Feature: swarm-marketplace, Property 14: Invalid share sums are rejected
    /// @notice For any shares that don't sum to BASIS_POINTS, distribution SHALL revert.

    function testFuzz_Property14_InvalidShareSumReverts(
        uint256 seed,
        uint8 agentCount,
        uint256 totalAmount,
        int256 shareOffset
    ) public {
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);
        // Offset must be non-zero to make shares invalid
        shareOffset = int256(bound(uint256(shareOffset > 0 ? shareOffset : -shareOffset), 1, 1000));
        if (seed % 2 == 0) shareOffset = -shareOffset;

        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, agentCount);

        // Modify last share to make sum invalid
        if (shareOffset > 0) {
            shares[agentCount - 1] += uint256(shareOffset);
        } else {
            uint256 absOffset = uint256(-shareOffset);
            if (shares[agentCount - 1] > absOffset) {
                shares[agentCount - 1] -= absOffset;
            } else {
                shares[agentCount - 1] = 0;
            }
        }

        vm.startPrank(payer);
        mnee.approve(address(payments), totalAmount);

        vm.expectRevert(AgentPayments.InvalidShares.selector);
        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();
    }

    // ============ Property 16: State Changes Emit Events ============
    /// @dev Feature: swarm-marketplace, Property 16: State changes emit events
    /// @notice For any payment distribution, the PaymentDistributed event SHALL be
    ///         emitted with accurate data (swarmId, agents, amounts, totalAmount).

    function testFuzz_Property16_DistributionEmitsEvent(
        uint256 seed,
        uint8 agentCount,
        uint256 totalAmount
    ) public {
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);

        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, agentCount);

        // Calculate expected amounts
        uint256[] memory expectedAmounts = new uint256[](agentCount);
        uint256 distributed = 0;
        for (uint256 i = 0; i < agentCount; i++) {
            expectedAmounts[i] = (totalAmount * shares[i]) / BASIS_POINTS;
            distributed += expectedAmounts[i];
        }
        // Add dust to first agent
        uint256 dust = totalAmount - distributed;
        expectedAmounts[0] += dust;

        vm.startPrank(payer);
        mnee.approve(address(payments), totalAmount);

        // Expect the event with correct parameters
        vm.expectEmit(true, false, false, true);
        emit AgentPayments.PaymentDistributed(swarmId, agents, expectedAmounts, totalAmount);

        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();
    }

    // ============ Property 17: Failed Distribution Retains Escrow ============
    /// @dev Feature: swarm-marketplace, Property 17: Failed distribution retains escrow
    /// @notice For any payment distribution that fails (invalid shares, transfer failure),
    ///         the escrow balance SHALL remain unchanged.

    function testFuzz_Property17_FailedDistributionRetainsEscrow_InvalidShares(
        uint256 seed,
        uint8 agentCount,
        uint256 totalAmount
    ) public {
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);

        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, agentCount);

        // Make shares invalid by adding 1 to last share
        shares[agentCount - 1] += 1;

        // Record balances before
        uint256 payerBalanceBefore = mnee.balanceOf(payer);
        uint256 contractBalanceBefore = mnee.balanceOf(address(payments));

        vm.startPrank(payer);
        mnee.approve(address(payments), totalAmount);

        vm.expectRevert(AgentPayments.InvalidShares.selector);
        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();

        // Verify balances unchanged
        assertEq(mnee.balanceOf(payer), payerBalanceBefore, "Payer balance changed after failed distribution");
        assertEq(mnee.balanceOf(address(payments)), contractBalanceBefore, "Contract balance changed after failed distribution");
    }

    function testFuzz_Property17_FailedDistributionRetainsEscrow_InsufficientBalance(
        uint256 seed,
        uint8 agentCount,
        uint256 totalAmount
    ) public {
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);

        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, agentCount);

        // Create a new payer with insufficient balance
        address poorPayer = address(0x999);
        uint256 insufficientBalance = totalAmount / 2;
        mnee.mint(poorPayer, insufficientBalance);

        // Record balances before
        uint256 payerBalanceBefore = mnee.balanceOf(poorPayer);
        uint256 contractBalanceBefore = mnee.balanceOf(address(payments));

        vm.startPrank(poorPayer);
        mnee.approve(address(payments), totalAmount);

        // Should revert due to insufficient balance
        vm.expectRevert();
        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();

        // Verify balances unchanged
        assertEq(mnee.balanceOf(poorPayer), payerBalanceBefore, "Payer balance changed after failed distribution");
        assertEq(mnee.balanceOf(address(payments)), contractBalanceBefore, "Contract balance changed after failed distribution");
    }

    function testFuzz_Property17_FailedDistributionRetainsEscrow_ZeroAmount(
        uint256 seed,
        uint8 agentCount
    ) public {
        agentCount = uint8(bound(agentCount, 1, MAX_AGENTS));

        address[] memory agents = _generateAgents(seed, agentCount);
        uint256[] memory shares = _generateValidShares(seed, agentCount);

        // Record balances before
        uint256 payerBalanceBefore = mnee.balanceOf(payer);
        uint256 contractBalanceBefore = mnee.balanceOf(address(payments));

        vm.startPrank(payer);
        mnee.approve(address(payments), 1);

        vm.expectRevert(AgentPayments.ZeroTotalAmount.selector);
        payments.distributePayment(swarmId, agents, shares, 0);
        vm.stopPrank();

        // Verify balances unchanged
        assertEq(mnee.balanceOf(payer), payerBalanceBefore, "Payer balance changed after failed distribution");
        assertEq(mnee.balanceOf(address(payments)), contractBalanceBefore, "Contract balance changed after failed distribution");
    }

    function testFuzz_Property17_FailedDistributionRetainsEscrow_EmptyAgents(
        uint256 totalAmount
    ) public {
        totalAmount = bound(totalAmount, 1, MAX_TOTAL_AMOUNT);

        address[] memory agents = new address[](0);
        uint256[] memory shares = new uint256[](0);

        // Record balances before
        uint256 payerBalanceBefore = mnee.balanceOf(payer);
        uint256 contractBalanceBefore = mnee.balanceOf(address(payments));

        vm.startPrank(payer);
        mnee.approve(address(payments), totalAmount);

        vm.expectRevert(AgentPayments.EmptyAgents.selector);
        payments.distributePayment(swarmId, agents, shares, totalAmount);
        vm.stopPrank();

        // Verify balances unchanged
        assertEq(mnee.balanceOf(payer), payerBalanceBefore, "Payer balance changed after failed distribution");
        assertEq(mnee.balanceOf(address(payments)), contractBalanceBefore, "Contract balance changed after failed distribution");
    }
}
