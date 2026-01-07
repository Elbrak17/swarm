// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Constants} from "./Constants.sol";

/**
 * @title SwarmRegistry
 * @notice Manages registration and metadata of AI agent swarms
 * @dev Uses bytes32 for swarmId to optimize gas (Requirement 11.1)
 */
contract SwarmRegistry {
    using SafeERC20 for IERC20;

    /// @notice MNEE token contract (immutable for gas optimization - Requirement 11.4)
    IERC20 public immutable MNEE_TOKEN;

    /// @notice Swarm data structure
    struct Swarm {
        address owner;
        address[] agents;
        uint256 totalBudget;
        uint8 rating;      // 0-50 (stars * 10 for precision)
        bool isActive;
    }

    /// @notice Mapping from swarmId to Swarm data
    mapping(bytes32 => Swarm) public swarms;

    /// @notice Mapping from owner address to their swarm IDs
    mapping(address => bytes32[]) public ownerSwarms;

    /// @notice Counter for generating unique swarm IDs
    uint256 private _swarmNonce;

    // Events (Requirement 10.5)
    event SwarmRegistered(bytes32 indexed swarmId, address indexed owner, string name);
    event BudgetAdded(bytes32 indexed swarmId, uint256 amount);
    event SwarmDeactivated(bytes32 indexed swarmId);
    event RatingUpdated(bytes32 indexed swarmId, uint8 newRating);

    // Custom errors for gas efficiency
    error SwarmNotFound();
    error NotSwarmOwner();
    error SwarmInactive();
    error InvalidRating();
    error EmptyAgents();

    /**
     * @notice Constructor sets the MNEE token address
     * @param _mneeToken Address of the MNEE ERC20 token
     */
    constructor(address _mneeToken) {
        MNEE_TOKEN = IERC20(_mneeToken);
    }

    /**
     * @notice Register a new swarm with agents
     * @param name Name of the swarm (used in event, not stored on-chain for gas)
     * @param agents Array of agent wallet addresses
     * @return swarmId Unique identifier for the swarm (bytes32)
     * @dev Generates unique swarmId using keccak256 of owner, nonce, and block data (Requirement 2.2)
     */
    function registerSwarm(
        string calldata name,
        address[] calldata agents
    ) external returns (bytes32 swarmId) {
        if (agents.length == 0) revert EmptyAgents();

        // Generate unique swarmId (Requirement 11.1 - bytes32 for gas efficiency)
        swarmId = keccak256(
            abi.encodePacked(
                msg.sender,
                _swarmNonce++,
                block.timestamp,
                block.prevrandao
            )
        );

        // Create swarm with initial values
        Swarm storage swarm = swarms[swarmId];
        swarm.owner = msg.sender;
        swarm.agents = agents;
        swarm.totalBudget = 0;
        swarm.rating = 0;
        swarm.isActive = true;

        // Track owner's swarms
        ownerSwarms[msg.sender].push(swarmId);

        emit SwarmRegistered(swarmId, msg.sender, name);
    }

    /**
     * @notice Add MNEE budget to a swarm
     * @param swarmId The swarm to add budget to
     * @param amount Amount of MNEE to add
     * @dev Uses SafeERC20 for secure transfers (Requirement 10.4)
     */
    function addBudget(bytes32 swarmId, uint256 amount) external {
        Swarm storage swarm = swarms[swarmId];
        if (swarm.owner == address(0)) revert SwarmNotFound();
        if (!swarm.isActive) revert SwarmInactive();

        // Transfer MNEE from user to contract
        MNEE_TOKEN.safeTransferFrom(msg.sender, address(this), amount);

        // Update budget
        swarm.totalBudget += amount;

        emit BudgetAdded(swarmId, amount);
    }

    /**
     * @notice Deactivate a swarm (only owner)
     * @param swarmId The swarm to deactivate
     * @dev Only swarm owner can deactivate (Requirement 2.4)
     */
    function deactivateSwarm(bytes32 swarmId) external {
        Swarm storage swarm = swarms[swarmId];
        if (swarm.owner == address(0)) revert SwarmNotFound();
        if (swarm.owner != msg.sender) revert NotSwarmOwner();

        swarm.isActive = false;

        emit SwarmDeactivated(swarmId);
    }

    /**
     * @notice Update swarm rating (only owner)
     * @param swarmId The swarm to update
     * @param rating New rating (0-50, representing 0-5 stars with 0.1 precision)
     * @dev Only swarm owner can update rating (Requirement 2.4)
     */
    function updateRating(bytes32 swarmId, uint8 rating) external {
        if (rating > Constants.MAX_RATING) revert InvalidRating();

        Swarm storage swarm = swarms[swarmId];
        if (swarm.owner == address(0)) revert SwarmNotFound();
        if (swarm.owner != msg.sender) revert NotSwarmOwner();

        swarm.rating = rating;

        emit RatingUpdated(swarmId, rating);
    }

    /**
     * @notice Get swarm data
     * @param swarmId The swarm to query
     * @return Swarm struct with all data
     */
    function getSwarm(bytes32 swarmId) external view returns (Swarm memory) {
        Swarm storage swarm = swarms[swarmId];
        if (swarm.owner == address(0)) revert SwarmNotFound();
        return swarm;
    }

    /**
     * @notice Get agents for a swarm
     * @param swarmId The swarm to query
     * @return Array of agent addresses
     */
    function getSwarmAgents(bytes32 swarmId) external view returns (address[] memory) {
        Swarm storage swarm = swarms[swarmId];
        if (swarm.owner == address(0)) revert SwarmNotFound();
        return swarm.agents;
    }

    /**
     * @notice Get all swarm IDs owned by an address
     * @param owner The owner address to query
     * @return Array of swarm IDs
     */
    function getOwnerSwarms(address owner) external view returns (bytes32[] memory) {
        return ownerSwarms[owner];
    }

    /**
     * @notice Check if a swarm exists and is active
     * @param swarmId The swarm to check
     * @return exists Whether the swarm exists
     * @return active Whether the swarm is active
     */
    function isSwarmActive(bytes32 swarmId) external view returns (bool exists, bool active) {
        Swarm storage swarm = swarms[swarmId];
        exists = swarm.owner != address(0);
        active = swarm.isActive;
    }
}
