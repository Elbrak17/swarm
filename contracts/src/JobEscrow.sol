// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title JobEscrow
 * @notice Manages job creation, bidding, and payment escrow for SWARM marketplace
 * @dev Implements reentrancy guards on payment functions (Requirement 10.2)
 */
contract JobEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice MNEE token contract (immutable for gas optimization - Requirement 11.4)
    IERC20 public immutable MNEE_TOKEN;

    /// @notice Address that receives payments (AgentPayments contract)
    address public paymentReceiver;

    /// @notice Job status enum
    enum JobStatus { OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, DISPUTED }

    /// @notice Job data structure
    struct Job {
        address client;
        bytes32 swarmId;
        uint256 payment;
        JobStatus status;
        string resultHash;  // IPFS hash of job result
    }

    /// @notice Mapping from jobId to Job data
    mapping(uint256 => Job) public jobs;

    /// @notice Next job ID counter
    uint256 public nextJobId;

    /// @notice Mapping from client address to their job IDs
    mapping(address => uint256[]) public clientJobs;

    // Events (Requirement 10.5)
    event JobCreated(uint256 indexed jobId, address indexed client, uint256 payment);
    event BidAccepted(uint256 indexed jobId, bytes32 indexed swarmId);
    event JobStarted(uint256 indexed jobId);
    event JobCompleted(uint256 indexed jobId, string resultHash);
    event PaymentReleased(uint256 indexed jobId, uint256 amount);
    event PaymentReceiverUpdated(address indexed newReceiver);

    // Custom errors for gas efficiency
    error JobNotFound();
    error InvalidJobStatus();
    error NotJobClient();
    error InvalidPayment();
    error TransferFailed();
    error InvalidReceiver();
    error NotAssignedSwarm();

    /**
     * @notice Constructor sets the MNEE token address
     * @param _mneeToken Address of the MNEE ERC20 token
     * @param _paymentReceiver Address of the AgentPayments contract
     */
    constructor(address _mneeToken, address _paymentReceiver) {
        MNEE_TOKEN = IERC20(_mneeToken);
        paymentReceiver = _paymentReceiver;
    }

    /**
     * @notice Create a new job with MNEE escrow
     * @param payment Amount of MNEE to escrow for the job
     * @return jobId The ID of the created job
     * @dev Transfers MNEE from client to contract (Requirement 3.2)
     */
    function createJob(uint256 payment) external returns (uint256 jobId) {
        // Validate payment amount (Requirement 3.5)
        if (payment == 0) revert InvalidPayment();

        // Get next job ID
        jobId = nextJobId++;

        // Create job with OPEN status (Requirement 3.1)
        jobs[jobId] = Job({
            client: msg.sender,
            swarmId: bytes32(0),
            payment: payment,
            status: JobStatus.OPEN,
            resultHash: ""
        });

        // Track client's jobs
        clientJobs[msg.sender].push(jobId);

        // Transfer MNEE to escrow (Requirement 3.2, 10.4)
        MNEE_TOKEN.safeTransferFrom(msg.sender, address(this), payment);

        emit JobCreated(jobId, msg.sender, payment);
    }

    /**
     * @notice Accept a bid for a job (client only)
     * @param jobId The job to accept bid for
     * @param swarmId The swarm whose bid is being accepted
     * @dev Only works for OPEN jobs (Requirement 4.6)
     */
    function acceptBid(uint256 jobId, bytes32 swarmId) external {
        Job storage job = jobs[jobId];

        // Validate job exists
        if (job.client == address(0)) revert JobNotFound();

        // Only client can accept bids
        if (job.client != msg.sender) revert NotJobClient();

        // Only OPEN jobs can have bids accepted (Requirement 4.6)
        if (job.status != JobStatus.OPEN) revert InvalidJobStatus();

        // Update job status to ASSIGNED (Requirement 4.4)
        job.status = JobStatus.ASSIGNED;
        job.swarmId = swarmId;

        emit BidAccepted(jobId, swarmId);
    }

    /**
     * @notice Start job execution (assigned swarm only)
     * @param jobId The job to start
     * @dev Only works for ASSIGNED jobs (Requirement 5.2)
     */
    function startJob(uint256 jobId) external {
        Job storage job = jobs[jobId];

        // Validate job exists
        if (job.client == address(0)) revert JobNotFound();

        // Only ASSIGNED jobs can be started
        if (job.status != JobStatus.ASSIGNED) revert InvalidJobStatus();

        // Update status to IN_PROGRESS (Requirement 5.2)
        job.status = JobStatus.IN_PROGRESS;

        emit JobStarted(jobId);
    }

    /**
     * @notice Complete a job with result hash
     * @param jobId The job to complete
     * @param resultHash IPFS hash of the job result
     */
    function completeJob(uint256 jobId, string calldata resultHash) external {
        Job storage job = jobs[jobId];

        // Validate job exists
        if (job.client == address(0)) revert JobNotFound();

        // Only IN_PROGRESS jobs can be completed
        if (job.status != JobStatus.IN_PROGRESS) revert InvalidJobStatus();

        // Update status and store result
        job.status = JobStatus.COMPLETED;
        job.resultHash = resultHash;

        emit JobCompleted(jobId, resultHash);
    }

    /**
     * @notice Release payment from escrow to AgentPayments contract
     * @param jobId The job to release payment for
     * @dev Uses reentrancy guard (Requirement 10.2)
     */
    function releasePayment(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        // Validate job exists
        if (job.client == address(0)) revert JobNotFound();

        // Only client can release payment
        if (job.client != msg.sender) revert NotJobClient();

        // Only COMPLETED jobs can have payment released
        if (job.status != JobStatus.COMPLETED) revert InvalidJobStatus();

        // Get payment amount before clearing
        uint256 paymentAmount = job.payment;

        // Clear payment to prevent double release
        job.payment = 0;

        // Transfer to payment receiver (AgentPayments contract)
        if (paymentReceiver == address(0)) revert InvalidReceiver();
        MNEE_TOKEN.safeTransfer(paymentReceiver, paymentAmount);

        emit PaymentReleased(jobId, paymentAmount);
    }

    /**
     * @notice Get job data
     * @param jobId The job to query
     * @return Job struct with all data
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        Job storage job = jobs[jobId];
        if (job.client == address(0) && jobId >= nextJobId) revert JobNotFound();
        return job;
    }

    /**
     * @notice Get all job IDs for a client
     * @param client The client address to query
     * @return Array of job IDs
     */
    function getClientJobs(address client) external view returns (uint256[] memory) {
        return clientJobs[client];
    }

    /**
     * @notice Update the payment receiver address
     * @param newReceiver New address for payment receiver
     * @dev Should be called to set AgentPayments contract address
     */
    function setPaymentReceiver(address newReceiver) external {
        if (newReceiver == address(0)) revert InvalidReceiver();
        paymentReceiver = newReceiver;
        emit PaymentReceiverUpdated(newReceiver);
    }

    /**
     * @notice Get the escrow balance for a specific job
     * @param jobId The job to check
     * @return The escrowed payment amount
     */
    function getJobEscrow(uint256 jobId) external view returns (uint256) {
        return jobs[jobId].payment;
    }
}
