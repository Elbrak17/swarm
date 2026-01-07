// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SwarmRegistry} from "../src/SwarmRegistry.sol";
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

/// @title SwarmRegistry Unit Tests
contract SwarmRegistryTest is Test {
    SwarmRegistry public registry;
    MockMNEE public mnee;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public agent1 = address(0x10);
    address public agent2 = address(0x20);
    address public agent3 = address(0x30);

    function setUp() public {
        mnee = new MockMNEE();
        registry = new SwarmRegistry(address(mnee));

        // Fund users with MNEE
        mnee.mint(user1, 10_000 * 10**18);
        mnee.mint(user2, 10_000 * 10**18);
    }

    // ============ registerSwarm Tests ============

    function test_RegisterSwarm_Success() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Verify swarm was created
        SwarmRegistry.Swarm memory swarm = registry.getSwarm(swarmId);
        assertEq(swarm.owner, user1);
        assertEq(swarm.agents.length, 2);
        assertEq(swarm.agents[0], agent1);
        assertEq(swarm.agents[1], agent2);
        assertEq(swarm.totalBudget, 0);
        assertEq(swarm.rating, 0);
        assertTrue(swarm.isActive);
    }

    function test_RegisterSwarm_EmitsEvent() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;

        vm.prank(user1);
        vm.expectEmit(false, true, false, true);
        emit SwarmRegistry.SwarmRegistered(bytes32(0), user1, "My Swarm");
        registry.registerSwarm("My Swarm", agents);
    }

    function test_RegisterSwarm_UniqueIds() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;

        vm.prank(user1);
        bytes32 swarmId1 = registry.registerSwarm("Swarm 1", agents);

        vm.prank(user1);
        bytes32 swarmId2 = registry.registerSwarm("Swarm 2", agents);

        assertTrue(swarmId1 != swarmId2, "Swarm IDs should be unique");
    }

    function test_RegisterSwarm_RevertsOnEmptyAgents() public {
        address[] memory agents = new address[](0);

        vm.prank(user1);
        vm.expectRevert(SwarmRegistry.EmptyAgents.selector);
        registry.registerSwarm("Empty Swarm", agents);
    }

    // ============ addBudget Tests ============

    function test_AddBudget_Success() public {
        // Register swarm
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Approve and add budget
        uint256 budgetAmount = 1000 * 10**18;
        vm.startPrank(user1);
        mnee.approve(address(registry), budgetAmount);
        registry.addBudget(swarmId, budgetAmount);
        vm.stopPrank();

        // Verify budget was added
        SwarmRegistry.Swarm memory swarm = registry.getSwarm(swarmId);
        assertEq(swarm.totalBudget, budgetAmount);
    }

    function test_AddBudget_EmitsEvent() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        uint256 budgetAmount = 500 * 10**18;
        vm.startPrank(user1);
        mnee.approve(address(registry), budgetAmount);

        vm.expectEmit(true, false, false, true);
        emit SwarmRegistry.BudgetAdded(swarmId, budgetAmount);
        registry.addBudget(swarmId, budgetAmount);
        vm.stopPrank();
    }

    function test_AddBudget_RevertsOnNonexistentSwarm() public {
        bytes32 fakeSwarmId = keccak256("fake");

        vm.prank(user1);
        vm.expectRevert(SwarmRegistry.SwarmNotFound.selector);
        registry.addBudget(fakeSwarmId, 100);
    }

    function test_AddBudget_RevertsOnInactiveSwarm() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Deactivate swarm
        vm.prank(user1);
        registry.deactivateSwarm(swarmId);

        // Try to add budget
        vm.startPrank(user1);
        mnee.approve(address(registry), 100);
        vm.expectRevert(SwarmRegistry.SwarmInactive.selector);
        registry.addBudget(swarmId, 100);
        vm.stopPrank();
    }

    // ============ deactivateSwarm Tests ============

    function test_DeactivateSwarm_Success() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user1);
        registry.deactivateSwarm(swarmId);

        (bool exists, bool active) = registry.isSwarmActive(swarmId);
        assertTrue(exists);
        assertFalse(active);
    }

    function test_DeactivateSwarm_EmitsEvent() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit SwarmRegistry.SwarmDeactivated(swarmId);
        registry.deactivateSwarm(swarmId);
    }

    function test_DeactivateSwarm_RevertsOnNonOwner() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user2);
        vm.expectRevert(SwarmRegistry.NotSwarmOwner.selector);
        registry.deactivateSwarm(swarmId);
    }

    // ============ updateRating Tests ============

    function test_UpdateRating_Success() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user1);
        registry.updateRating(swarmId, 45); // 4.5 stars

        SwarmRegistry.Swarm memory swarm = registry.getSwarm(swarmId);
        assertEq(swarm.rating, 45);
    }

    function test_UpdateRating_EmitsEvent() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit SwarmRegistry.RatingUpdated(swarmId, 30);
        registry.updateRating(swarmId, 30);
    }

    function test_UpdateRating_RevertsOnInvalidRating() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user1);
        vm.expectRevert(SwarmRegistry.InvalidRating.selector);
        registry.updateRating(swarmId, 51); // Max is 50
    }

    function test_UpdateRating_RevertsOnNonOwner() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        vm.prank(user2);
        vm.expectRevert(SwarmRegistry.NotSwarmOwner.selector);
        registry.updateRating(swarmId, 25);
    }

    // ============ View Function Tests ============

    function test_GetOwnerSwarms() public {
        address[] memory agents = new address[](1);
        agents[0] = agent1;

        vm.startPrank(user1);
        bytes32 swarmId1 = registry.registerSwarm("Swarm 1", agents);
        bytes32 swarmId2 = registry.registerSwarm("Swarm 2", agents);
        vm.stopPrank();

        bytes32[] memory userSwarms = registry.getOwnerSwarms(user1);
        assertEq(userSwarms.length, 2);
        assertEq(userSwarms[0], swarmId1);
        assertEq(userSwarms[1], swarmId2);
    }

    function test_GetSwarmAgents() public {
        address[] memory agents = new address[](3);
        agents[0] = agent1;
        agents[1] = agent2;
        agents[2] = agent3;

        vm.prank(user1);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        address[] memory returnedAgents = registry.getSwarmAgents(swarmId);
        assertEq(returnedAgents.length, 3);
        assertEq(returnedAgents[0], agent1);
        assertEq(returnedAgents[1], agent2);
        assertEq(returnedAgents[2], agent3);
    }
}

/// @title SwarmRegistry Property-Based Tests
/// @notice Fuzz tests validating correctness properties from design document
/// @dev Feature: swarm-marketplace, Properties 1-4
contract SwarmRegistryPropertyTest is Test {
    SwarmRegistry public registry;
    MockMNEE public mnee;

    function setUp() public {
        mnee = new MockMNEE();
        registry = new SwarmRegistry(address(mnee));
    }

    // ============ Property 1: Swarm Registration Creates Valid Record ============
    /// @dev Feature: swarm-marketplace, Property 1: Swarm Registration Creates Valid Record
    /// @notice For any valid swarm registration input (name, agents array), the SwarmRegistry 
    /// contract SHALL create a swarm record with the correct owner, agents, zero budget, 
    /// zero rating, and active status, AND emit a SwarmRegistered event with matching data.
    /// **Validates: Requirements 2.1**
    function testFuzz_Property1_SwarmRegistrationCreatesValidRecord(
        address owner,
        uint8 agentCount,
        string calldata name
    ) public {
        // Bound inputs to reasonable values
        vm.assume(owner != address(0));
        agentCount = uint8(bound(agentCount, 1, 10)); // At least 1 agent, max 10 for gas

        // Generate agent addresses
        address[] memory agents = new address[](agentCount);
        for (uint8 i = 0; i < agentCount; i++) {
            agents[i] = address(uint160(uint256(keccak256(abi.encodePacked(owner, i)))));
        }

        // Register swarm
        vm.prank(owner);
        bytes32 swarmId = registry.registerSwarm(name, agents);

        // Verify swarm record is valid
        SwarmRegistry.Swarm memory swarm = registry.getSwarm(swarmId);
        
        // Property assertions
        assertEq(swarm.owner, owner, "Owner should match caller");
        assertEq(swarm.agents.length, agentCount, "Agent count should match");
        for (uint8 i = 0; i < agentCount; i++) {
            assertEq(swarm.agents[i], agents[i], "Agent address should match");
        }
        assertEq(swarm.totalBudget, 0, "Initial budget should be zero");
        assertEq(swarm.rating, 0, "Initial rating should be zero");
        assertTrue(swarm.isActive, "Swarm should be active");
    }

    // ============ Property 2: SwarmIds Are Unique ============
    /// @dev Feature: swarm-marketplace, Property 2: SwarmIds Are Unique
    /// @notice For any two different swarm registrations, the generated swarmIds SHALL be 
    /// different (no collisions).
    /// **Validates: Requirements 2.2**
    function testFuzz_Property2_SwarmIdsAreUnique(
        address owner1,
        address owner2,
        uint8 seed1,
        uint8 seed2
    ) public {
        // Bound inputs
        vm.assume(owner1 != address(0));
        vm.assume(owner2 != address(0));

        // Create agents for both swarms
        address[] memory agents1 = new address[](1);
        agents1[0] = address(uint160(uint256(keccak256(abi.encodePacked(seed1)))));
        
        address[] memory agents2 = new address[](1);
        agents2[0] = address(uint160(uint256(keccak256(abi.encodePacked(seed2)))));

        // Register first swarm
        vm.prank(owner1);
        bytes32 swarmId1 = registry.registerSwarm("Swarm 1", agents1);

        // Register second swarm (even with same owner)
        vm.prank(owner2);
        bytes32 swarmId2 = registry.registerSwarm("Swarm 2", agents2);

        // Property assertion: IDs must be unique
        assertTrue(swarmId1 != swarmId2, "SwarmIds must be unique");
    }

    /// @dev Additional uniqueness test: same owner registering multiple swarms
    /// @notice Validates that even the same owner gets unique IDs for each swarm
    function testFuzz_Property2_SameOwnerGetsUniqueIds(
        address owner,
        uint8 numSwarms
    ) public {
        vm.assume(owner != address(0));
        numSwarms = uint8(bound(numSwarms, 2, 20)); // At least 2 swarms, max 20

        bytes32[] memory swarmIds = new bytes32[](numSwarms);
        address[] memory agents = new address[](1);
        agents[0] = address(0x1234);

        // Register multiple swarms
        for (uint8 i = 0; i < numSwarms; i++) {
            vm.prank(owner);
            swarmIds[i] = registry.registerSwarm(string(abi.encodePacked("Swarm ", i)), agents);
        }

        // Verify all IDs are unique
        for (uint8 i = 0; i < numSwarms; i++) {
            for (uint8 j = i + 1; j < numSwarms; j++) {
                assertTrue(swarmIds[i] != swarmIds[j], "All swarmIds must be unique");
            }
        }
    }

    // ============ Property 3: Budget Addition Transfers MNEE Correctly ============
    /// @dev Feature: swarm-marketplace, Property 3: Budget Addition Transfers MNEE Correctly
    /// @notice For any budget addition of amount X to a swarm, the contract's MNEE balance 
    /// SHALL increase by X, the user's MNEE balance SHALL decrease by X, and the swarm's 
    /// totalBudget SHALL increase by X.
    /// **Validates: Requirements 2.3**
    function testFuzz_Property3_BudgetAdditionTransfersMNEECorrectly(
        address owner,
        uint256 budgetAmount
    ) public {
        vm.assume(owner != address(0));
        // Bound budget to reasonable range (avoid overflow, ensure non-zero)
        budgetAmount = bound(budgetAmount, 1, 1_000_000 * 10**18);

        // Setup: mint MNEE to owner
        mnee.mint(owner, budgetAmount);

        // Register swarm
        address[] memory agents = new address[](1);
        agents[0] = address(0x1234);
        vm.prank(owner);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Record balances before
        uint256 ownerBalanceBefore = mnee.balanceOf(owner);
        uint256 contractBalanceBefore = mnee.balanceOf(address(registry));
        SwarmRegistry.Swarm memory swarmBefore = registry.getSwarm(swarmId);

        // Add budget
        vm.startPrank(owner);
        mnee.approve(address(registry), budgetAmount);
        registry.addBudget(swarmId, budgetAmount);
        vm.stopPrank();

        // Record balances after
        uint256 ownerBalanceAfter = mnee.balanceOf(owner);
        uint256 contractBalanceAfter = mnee.balanceOf(address(registry));
        SwarmRegistry.Swarm memory swarmAfter = registry.getSwarm(swarmId);

        // Property assertions
        assertEq(
            ownerBalanceBefore - ownerBalanceAfter, 
            budgetAmount, 
            "Owner balance should decrease by budget amount"
        );
        assertEq(
            contractBalanceAfter - contractBalanceBefore, 
            budgetAmount, 
            "Contract balance should increase by budget amount"
        );
        assertEq(
            swarmAfter.totalBudget - swarmBefore.totalBudget, 
            budgetAmount, 
            "Swarm totalBudget should increase by budget amount"
        );
    }

    /// @dev Additional test: multiple budget additions accumulate correctly
    function testFuzz_Property3_MultipleBudgetAdditionsAccumulate(
        address owner,
        uint256 amount1,
        uint256 amount2
    ) public {
        vm.assume(owner != address(0));
        // Bound amounts to avoid overflow
        amount1 = bound(amount1, 1, 500_000 * 10**18);
        amount2 = bound(amount2, 1, 500_000 * 10**18);

        // Setup
        mnee.mint(owner, amount1 + amount2);
        
        address[] memory agents = new address[](1);
        agents[0] = address(0x1234);
        vm.prank(owner);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Add first budget
        vm.startPrank(owner);
        mnee.approve(address(registry), amount1 + amount2);
        registry.addBudget(swarmId, amount1);
        
        SwarmRegistry.Swarm memory swarmAfterFirst = registry.getSwarm(swarmId);
        assertEq(swarmAfterFirst.totalBudget, amount1, "Budget should equal first amount");

        // Add second budget
        registry.addBudget(swarmId, amount2);
        vm.stopPrank();

        SwarmRegistry.Swarm memory swarmAfterSecond = registry.getSwarm(swarmId);
        assertEq(
            swarmAfterSecond.totalBudget, 
            amount1 + amount2, 
            "Budget should equal sum of both amounts"
        );
    }

    // ============ Property 4: Only Owner Can Modify Swarm ============
    /// @dev Feature: swarm-marketplace, Property 4: Only Owner Can Modify Swarm
    /// @notice For any swarm and any address that is not the swarm owner, attempts to 
    /// modify swarm settings (deactivate, update rating) SHALL revert.
    /// **Validates: Requirements 2.4**
    function testFuzz_Property4_OnlyOwnerCanDeactivate(
        address owner,
        address nonOwner
    ) public {
        vm.assume(owner != address(0));
        vm.assume(nonOwner != address(0));
        vm.assume(owner != nonOwner);

        // Register swarm as owner
        address[] memory agents = new address[](1);
        agents[0] = address(0x1234);
        vm.prank(owner);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Non-owner tries to deactivate - should revert
        vm.prank(nonOwner);
        vm.expectRevert(SwarmRegistry.NotSwarmOwner.selector);
        registry.deactivateSwarm(swarmId);

        // Verify swarm is still active
        (bool exists, bool active) = registry.isSwarmActive(swarmId);
        assertTrue(exists, "Swarm should exist");
        assertTrue(active, "Swarm should still be active");
    }

    function testFuzz_Property4_OnlyOwnerCanUpdateRating(
        address owner,
        address nonOwner,
        uint8 rating
    ) public {
        vm.assume(owner != address(0));
        vm.assume(nonOwner != address(0));
        vm.assume(owner != nonOwner);
        rating = uint8(bound(rating, 0, 50)); // Valid rating range

        // Register swarm as owner
        address[] memory agents = new address[](1);
        agents[0] = address(0x1234);
        vm.prank(owner);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Non-owner tries to update rating - should revert
        vm.prank(nonOwner);
        vm.expectRevert(SwarmRegistry.NotSwarmOwner.selector);
        registry.updateRating(swarmId, rating);

        // Verify rating is unchanged
        SwarmRegistry.Swarm memory swarm = registry.getSwarm(swarmId);
        assertEq(swarm.rating, 0, "Rating should be unchanged");
    }

    /// @dev Verify owner CAN modify their swarm (positive case)
    function testFuzz_Property4_OwnerCanModifySwarm(
        address owner,
        uint8 rating
    ) public {
        vm.assume(owner != address(0));
        rating = uint8(bound(rating, 0, 50));

        // Register swarm
        address[] memory agents = new address[](1);
        agents[0] = address(0x1234);
        vm.prank(owner);
        bytes32 swarmId = registry.registerSwarm("Test Swarm", agents);

        // Owner updates rating - should succeed
        vm.prank(owner);
        registry.updateRating(swarmId, rating);

        SwarmRegistry.Swarm memory swarm = registry.getSwarm(swarmId);
        assertEq(swarm.rating, rating, "Owner should be able to update rating");

        // Owner deactivates - should succeed
        vm.prank(owner);
        registry.deactivateSwarm(swarmId);

        (bool exists, bool active) = registry.isSwarmActive(swarmId);
        assertTrue(exists, "Swarm should exist");
        assertFalse(active, "Owner should be able to deactivate swarm");
    }
}
