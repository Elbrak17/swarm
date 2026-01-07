// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SwarmRegistry} from "../src/SwarmRegistry.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {AgentPayments} from "../src/AgentPayments.sol";

/**
 * @title Deploy
 * @notice Deployment script for SWARM marketplace contracts
 * @dev Deploy to Sepolia: forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
 */
contract DeployScript is Script {
    /// @notice MNEE token address on Sepolia
    address constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;

    function setUp() public {}

    function run() public {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying SWARM contracts...");
        console.log("Deployer:", deployer);
        console.log("MNEE Token:", MNEE_TOKEN);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentPayments first (no dependencies)
        AgentPayments agentPayments = new AgentPayments(MNEE_TOKEN);
        console.log("AgentPayments deployed at:", address(agentPayments));

        // 2. Deploy SwarmRegistry
        SwarmRegistry swarmRegistry = new SwarmRegistry(MNEE_TOKEN);
        console.log("SwarmRegistry deployed at:", address(swarmRegistry));

        // 3. Deploy JobEscrow with AgentPayments as payment receiver
        JobEscrow jobEscrow = new JobEscrow(MNEE_TOKEN, address(agentPayments));
        console.log("JobEscrow deployed at:", address(jobEscrow));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Sepolia");
        console.log("MNEE Token:", MNEE_TOKEN);
        console.log("SwarmRegistry:", address(swarmRegistry));
        console.log("JobEscrow:", address(jobEscrow));
        console.log("AgentPayments:", address(agentPayments));
        console.log("==========================\n");
    }
}

/**
 * @title DeployLocal
 * @notice Deployment script for local testing with mock MNEE
 * @dev Deploy locally: forge script script/Deploy.s.sol:DeployLocalScript --fork-url http://localhost:8545 --broadcast
 */
contract DeployLocalScript is Script {
    function run() public {
        vm.startBroadcast();

        // For local testing, we'll use a mock address
        // In production, use the real MNEE token
        address mockMnee = address(0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF);

        // Deploy contracts
        AgentPayments agentPayments = new AgentPayments(mockMnee);
        SwarmRegistry swarmRegistry = new SwarmRegistry(mockMnee);
        JobEscrow jobEscrow = new JobEscrow(mockMnee, address(agentPayments));

        console.log("Local Deployment:");
        console.log("SwarmRegistry:", address(swarmRegistry));
        console.log("JobEscrow:", address(jobEscrow));
        console.log("AgentPayments:", address(agentPayments));

        vm.stopBroadcast();
    }
}
