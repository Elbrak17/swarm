// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Constants} from "./Constants.sol";

/**
 * @title AgentPayments
 * @notice Distributes MNEE payments to individual agents based on contribution shares
 * @dev Uses unchecked arithmetic for loop counters (Requirement 11.3)
 */
contract AgentPayments is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice MNEE token contract (immutable for gas optimization - Requirement 11.4)
    IERC20 public immutable MNEE_TOKEN;

    /// @notice Event emitted when payment is distributed (Requirement 10.5)
    event PaymentDistributed(
        bytes32 indexed swarmId,
        address[] agents,
        uint256[] amounts,
        uint256 totalAmount
    );

    // Custom errors for gas efficiency
    error ArrayLengthMismatch();
    error EmptyAgents();
    error ZeroTotalAmount();
    error InvalidShares();
    error TransferFailed();

    /**
     * @notice Constructor sets the MNEE token address
     * @param _mneeToken Address of the MNEE ERC20 token
     */
    constructor(address _mneeToken) {
        MNEE_TOKEN = IERC20(_mneeToken);
    }

    /**
     * @notice Distribute payment to agents based on shares
     * @param swarmId The swarm receiving payment
     * @param agents Array of agent addresses to pay
     * @param shares Array of share amounts for each agent (must sum to BASIS_POINTS)
     * @param totalAmount Total MNEE amount to distribute
     * @dev Validates agents.length == shares.length (Requirement 10.3)
     * @dev Uses unchecked arithmetic for loop counter (Requirement 11.3)
     */
    function distributePayment(
        bytes32 swarmId,
        address[] calldata agents,
        uint256[] calldata shares,
        uint256 totalAmount
    ) external nonReentrant {
        // Validate array lengths match (Requirement 10.3)
        if (agents.length != shares.length) revert ArrayLengthMismatch();
        if (agents.length == 0) revert EmptyAgents();
        if (totalAmount == 0) revert ZeroTotalAmount();

        // Validate shares sum to BASIS_POINTS (10000 = 100%)
        uint256 totalShares;
        uint256 agentCount = agents.length;

        // Use unchecked for loop counter (Requirement 11.3)
        for (uint256 i; i < agentCount;) {
            totalShares += shares[i];
            unchecked { ++i; }
        }

        if (totalShares != Constants.BASIS_POINTS) revert InvalidShares();

        // Transfer total amount from sender to this contract first
        MNEE_TOKEN.safeTransferFrom(msg.sender, address(this), totalAmount);

        // Calculate and distribute payments
        uint256[] memory amounts = new uint256[](agentCount);
        uint256 distributed;

        // Use unchecked for loop counter (Requirement 11.3)
        for (uint256 i; i < agentCount;) {
            // Calculate agent's share: (totalAmount * shares[i]) / BASIS_POINTS
            uint256 agentAmount = (totalAmount * shares[i]) / Constants.BASIS_POINTS;
            amounts[i] = agentAmount;
            distributed += agentAmount;

            // Transfer to agent
            MNEE_TOKEN.safeTransfer(agents[i], agentAmount);

            unchecked { ++i; }
        }

        // Handle any dust (rounding remainder) - send to first agent
        uint256 dust = totalAmount - distributed;
        if (dust > 0) {
            MNEE_TOKEN.safeTransfer(agents[0], dust);
            amounts[0] += dust;
        }

        emit PaymentDistributed(swarmId, agents, amounts, totalAmount);
    }

    /**
     * @notice Calculate payment amounts for agents without executing transfer
     * @param shares Array of share amounts for each agent
     * @param totalAmount Total amount to distribute
     * @return amounts Array of calculated payment amounts
     */
    function calculatePayments(
        uint256[] calldata shares,
        uint256 totalAmount
    ) external pure returns (uint256[] memory amounts) {
        uint256 agentCount = shares.length;
        amounts = new uint256[](agentCount);

        for (uint256 i; i < agentCount;) {
            amounts[i] = (totalAmount * shares[i]) / Constants.BASIS_POINTS;
            unchecked { ++i; }
        }

        return amounts;
    }

    /**
     * @notice Validate that shares sum to BASIS_POINTS
     * @param shares Array of share amounts
     * @return valid Whether shares are valid
     */
    function validateShares(uint256[] calldata shares) external pure returns (bool valid) {
        uint256 total;
        uint256 len = shares.length;

        for (uint256 i; i < len;) {
            total += shares[i];
            unchecked { ++i; }
        }

        return total == Constants.BASIS_POINTS;
    }
}
