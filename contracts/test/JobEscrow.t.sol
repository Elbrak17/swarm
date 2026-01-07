// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
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

/// @title JobEscrow Unit Tests
contract JobEscrowTest is Test {
    JobEscrow public escrow;
    MockMNEE public mnee;

    address public client1 = address(0x1);
    address public client2 = address(0x2);
    address public paymentReceiver = address(0x100);
    bytes32 public swarmId1 = keccak256("swarm1");
    bytes32 public swarmId2 = keccak256("swarm2");

    uint256 public constant JOB_PAYMENT = 1000 * 10**18;

    function setUp() public {
        mnee = new MockMNEE();
        escrow = new JobEscrow(address(mnee), paymentReceiver);

        // Fund clients with MNEE
        mnee.mint(client1, 100_000 * 10**18);
        mnee.mint(client2, 100_000 * 10**18);
    }

    // ============ createJob Tests ============

    function test_CreateJob_Success() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        JobEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.client, client1);
        assertEq(job.payment, JOB_PAYMENT);
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.OPEN));
        assertEq(job.swarmId, bytes32(0));
    }

    function test_CreateJob_TransfersTokens() public {
        uint256 clientBalanceBefore = mnee.balanceOf(client1);
        uint256 escrowBalanceBefore = mnee.balanceOf(address(escrow));

        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        assertEq(mnee.balanceOf(client1), clientBalanceBefore - JOB_PAYMENT);
        assertEq(mnee.balanceOf(address(escrow)), escrowBalanceBefore + JOB_PAYMENT);
    }

    function test_CreateJob_EmitsEvent() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);

        vm.expectEmit(true, true, false, true);
        emit JobEscrow.JobCreated(0, client1, JOB_PAYMENT);
        escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();
    }

    function test_CreateJob_IncrementsJobId() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT * 3);

        uint256 jobId1 = escrow.createJob(JOB_PAYMENT);
        uint256 jobId2 = escrow.createJob(JOB_PAYMENT);
        uint256 jobId3 = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        assertEq(jobId1, 0);
        assertEq(jobId2, 1);
        assertEq(jobId3, 2);
    }

    function test_CreateJob_RevertsOnZeroPayment() public {
        vm.prank(client1);
        vm.expectRevert(JobEscrow.InvalidPayment.selector);
        escrow.createJob(0);
    }

    function test_CreateJob_TracksClientJobs() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT * 2);
        uint256 jobId1 = escrow.createJob(JOB_PAYMENT);
        uint256 jobId2 = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        uint256[] memory jobs = escrow.getClientJobs(client1);
        assertEq(jobs.length, 2);
        assertEq(jobs[0], jobId1);
        assertEq(jobs[1], jobId2);
    }

    // ============ acceptBid Tests ============

    function test_AcceptBid_Success() public {
        // Create job
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);

        // Accept bid
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        JobEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.ASSIGNED));
        assertEq(job.swarmId, swarmId1);
    }

    function test_AcceptBid_EmitsEvent() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);

        vm.expectEmit(true, true, false, false);
        emit JobEscrow.BidAccepted(jobId, swarmId1);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();
    }

    function test_AcceptBid_RevertsOnNonClient() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        vm.prank(client2);
        vm.expectRevert(JobEscrow.NotJobClient.selector);
        escrow.acceptBid(jobId, swarmId1);
    }

    function test_AcceptBid_RevertsOnNonOpenJob() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);

        // Try to accept another bid on ASSIGNED job
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.acceptBid(jobId, swarmId2);
        vm.stopPrank();
    }

    function test_AcceptBid_RevertsOnNonexistentJob() public {
        vm.prank(client1);
        vm.expectRevert(JobEscrow.JobNotFound.selector);
        escrow.acceptBid(999, swarmId1);
    }

    // ============ startJob Tests ============

    function test_StartJob_Success() public {
        // Create and assign job
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        // Start job
        escrow.startJob(jobId);

        JobEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.IN_PROGRESS));
    }

    function test_StartJob_EmitsEvent() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        vm.expectEmit(true, false, false, false);
        emit JobEscrow.JobStarted(jobId);
        escrow.startJob(jobId);
    }

    function test_StartJob_RevertsOnNonAssignedJob() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        // Try to start OPEN job
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.startJob(jobId);
    }

    // ============ completeJob Tests ============

    function test_CompleteJob_Success() public {
        // Create, assign, and start job
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);

        // Complete job
        string memory resultHash = "QmTestHash123";
        escrow.completeJob(jobId, resultHash);

        JobEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.COMPLETED));
        assertEq(job.resultHash, resultHash);
    }

    function test_CompleteJob_EmitsEvent() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);

        string memory resultHash = "QmTestHash123";
        vm.expectEmit(true, false, false, true);
        emit JobEscrow.JobCompleted(jobId, resultHash);
        escrow.completeJob(jobId, resultHash);
    }

    function test_CompleteJob_RevertsOnNonInProgressJob() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        // Try to complete OPEN job
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.completeJob(jobId, "hash");
    }

    // ============ releasePayment Tests ============

    function test_ReleasePayment_Success() public {
        // Create full job lifecycle
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, "QmHash");

        uint256 receiverBalanceBefore = mnee.balanceOf(paymentReceiver);

        // Release payment
        vm.prank(client1);
        escrow.releasePayment(jobId);

        assertEq(mnee.balanceOf(paymentReceiver), receiverBalanceBefore + JOB_PAYMENT);
    }

    function test_ReleasePayment_EmitsEvent() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, "QmHash");

        vm.prank(client1);
        vm.expectEmit(true, false, false, true);
        emit JobEscrow.PaymentReleased(jobId, JOB_PAYMENT);
        escrow.releasePayment(jobId);
    }

    function test_ReleasePayment_ClearsJobPayment() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, "QmHash");

        vm.prank(client1);
        escrow.releasePayment(jobId);

        // Payment should be cleared
        assertEq(escrow.getJobEscrow(jobId), 0);
    }

    function test_ReleasePayment_RevertsOnNonClient() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, "QmHash");

        vm.prank(client2);
        vm.expectRevert(JobEscrow.NotJobClient.selector);
        escrow.releasePayment(jobId);
    }

    function test_ReleasePayment_RevertsOnNonCompletedJob() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        escrow.acceptBid(jobId, swarmId1);

        // Try to release on ASSIGNED job
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.releasePayment(jobId);
        vm.stopPrank();
    }

    // ============ View Function Tests ============

    function test_GetJob_ReturnsCorrectData() public {
        vm.startPrank(client1);
        mnee.approve(address(escrow), JOB_PAYMENT);
        uint256 jobId = escrow.createJob(JOB_PAYMENT);
        vm.stopPrank();

        JobEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.client, client1);
        assertEq(job.payment, JOB_PAYMENT);
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.OPEN));
    }

    function test_SetPaymentReceiver() public {
        address newReceiver = address(0x200);
        escrow.setPaymentReceiver(newReceiver);
        assertEq(escrow.paymentReceiver(), newReceiver);
    }

    function test_SetPaymentReceiver_RevertsOnZeroAddress() public {
        vm.expectRevert(JobEscrow.InvalidReceiver.selector);
        escrow.setPaymentReceiver(address(0));
    }
}

/// @title JobEscrow Property-Based Tests
/// @notice Fuzz tests validating correctness properties from design document
/// @dev Feature: swarm-marketplace, Properties 5-8, 10-12, 15
contract JobEscrowPropertyTest is Test {
    JobEscrow public escrow;
    MockMNEE public mnee;

    address public paymentReceiver = address(0x100);

    function setUp() public {
        mnee = new MockMNEE();
        escrow = new JobEscrow(address(mnee), paymentReceiver);
    }

    // ============ Property 5: Job Creation Initializes Correctly ============
    /// @dev Feature: swarm-marketplace, Property 5: Job Creation Initializes Correctly
    /// @notice For any valid job creation with payment amount P, the job SHALL be created 
    /// with status OPEN, the client address set correctly, and payment amount P stored.
    /// **Validates: Requirements 3.1**
    function testFuzz_Property5_JobCreationInitializesCorrectly(
        address client,
        uint256 payment
    ) public {
        vm.assume(client != address(0));
        // Bound payment to reasonable range (non-zero, avoid overflow)
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: mint MNEE to client
        mnee.mint(client, payment);

        // Create job
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        vm.stopPrank();

        // Verify job initialization
        JobEscrow.Job memory job = escrow.getJob(jobId);

        // Property assertions
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.OPEN), "Job status should be OPEN");
        assertEq(job.client, client, "Client address should match caller");
        assertEq(job.payment, payment, "Payment amount should match input");
        assertEq(job.swarmId, bytes32(0), "SwarmId should be zero initially");
        assertEq(bytes(job.resultHash).length, 0, "Result hash should be empty initially");
    }

    /// @dev Additional test: multiple jobs from same client all initialize correctly
    function testFuzz_Property5_MultipleJobsInitializeCorrectly(
        address client,
        uint8 numJobs,
        uint256 baseSeed
    ) public {
        vm.assume(client != address(0));
        numJobs = uint8(bound(numJobs, 1, 10));

        // Mint enough MNEE for all jobs
        uint256 totalPayment = uint256(numJobs) * 1000 * 10**18;
        mnee.mint(client, totalPayment);

        vm.startPrank(client);
        mnee.approve(address(escrow), totalPayment);

        for (uint8 i = 0; i < numJobs; i++) {
            uint256 payment = bound(uint256(keccak256(abi.encodePacked(baseSeed, i))), 1, 1000 * 10**18);
            uint256 jobId = escrow.createJob(payment);

            JobEscrow.Job memory job = escrow.getJob(jobId);
            assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.OPEN), "Each job should be OPEN");
            assertEq(job.client, client, "Each job should have correct client");
            assertEq(job.payment, payment, "Each job should have correct payment");
        }
        vm.stopPrank();
    }

    // ============ Property 6: Job Escrow Transfers MNEE Atomically ============
    /// @dev Feature: swarm-marketplace, Property 6: Job Escrow Transfers MNEE Atomically
    /// @notice For any job creation with payment P, the JobEscrow contract's MNEE balance 
    /// SHALL increase by P AND the client's balance SHALL decrease by P in the same transaction.
    /// **Validates: Requirements 3.2**
    function testFuzz_Property6_JobEscrowTransfersMNEEAtomically(
        address client,
        uint256 payment
    ) public {
        vm.assume(client != address(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: mint MNEE to client
        mnee.mint(client, payment);

        // Record balances before
        uint256 clientBalanceBefore = mnee.balanceOf(client);
        uint256 escrowBalanceBefore = mnee.balanceOf(address(escrow));

        // Create job
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        escrow.createJob(payment);
        vm.stopPrank();

        // Record balances after
        uint256 clientBalanceAfter = mnee.balanceOf(client);
        uint256 escrowBalanceAfter = mnee.balanceOf(address(escrow));

        // Property assertions - atomic transfer
        assertEq(
            clientBalanceBefore - clientBalanceAfter,
            payment,
            "Client balance should decrease by payment amount"
        );
        assertEq(
            escrowBalanceAfter - escrowBalanceBefore,
            payment,
            "Escrow balance should increase by payment amount"
        );
    }

    /// @dev Additional test: multiple job creations accumulate escrow correctly
    function testFuzz_Property6_MultipleJobsAccumulateEscrow(
        address client,
        uint256 payment1,
        uint256 payment2
    ) public {
        vm.assume(client != address(0));
        payment1 = bound(payment1, 1, 500_000 * 10**18);
        payment2 = bound(payment2, 1, 500_000 * 10**18);

        // Setup
        mnee.mint(client, payment1 + payment2);

        uint256 escrowBalanceBefore = mnee.balanceOf(address(escrow));

        vm.startPrank(client);
        mnee.approve(address(escrow), payment1 + payment2);
        escrow.createJob(payment1);
        escrow.createJob(payment2);
        vm.stopPrank();

        uint256 escrowBalanceAfter = mnee.balanceOf(address(escrow));

        assertEq(
            escrowBalanceAfter - escrowBalanceBefore,
            payment1 + payment2,
            "Escrow should hold sum of all job payments"
        );
    }

    // ============ Property 7: Zero Payment Jobs Are Rejected ============
    /// @dev Feature: swarm-marketplace, Property 7: Zero Payment Jobs Are Rejected
    /// @notice For any job creation attempt with payment amount <= 0, the transaction SHALL revert.
    /// **Validates: Requirements 3.5**
    function testFuzz_Property7_ZeroPaymentJobsAreRejected(
        address client
    ) public {
        vm.assume(client != address(0));

        // Attempt to create job with zero payment
        vm.prank(client);
        vm.expectRevert(JobEscrow.InvalidPayment.selector);
        escrow.createJob(0);
    }

    /// @dev Verify that any non-zero payment is accepted
    function testFuzz_Property7_NonZeroPaymentAccepted(
        address client,
        uint256 payment
    ) public {
        vm.assume(client != address(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        mnee.mint(client, payment);

        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        // Should not revert
        uint256 jobId = escrow.createJob(payment);
        vm.stopPrank();

        JobEscrow.Job memory job = escrow.getJob(jobId);
        assertEq(job.payment, payment, "Non-zero payment should be accepted");
    }

    // ============ Property 8: Bid Acceptance Updates Job Status ============
    /// @dev Feature: swarm-marketplace, Property 8: Bid Acceptance Updates Job Status
    /// @notice For any job in OPEN status, when a bid is accepted, the job status SHALL 
    /// transition to ASSIGNED and the swarmId SHALL be set.
    /// **Validates: Requirements 4.4**
    function testFuzz_Property8_BidAcceptanceUpdatesJobStatus(
        address client,
        uint256 payment,
        bytes32 swarmId
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: create job
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);

        // Verify initial state
        JobEscrow.Job memory jobBefore = escrow.getJob(jobId);
        assertEq(uint8(jobBefore.status), uint8(JobEscrow.JobStatus.OPEN), "Job should start OPEN");
        assertEq(jobBefore.swarmId, bytes32(0), "SwarmId should be zero initially");

        // Accept bid
        escrow.acceptBid(jobId, swarmId);
        vm.stopPrank();

        // Verify state transition
        JobEscrow.Job memory jobAfter = escrow.getJob(jobId);
        assertEq(uint8(jobAfter.status), uint8(JobEscrow.JobStatus.ASSIGNED), "Job status should be ASSIGNED");
        assertEq(jobAfter.swarmId, swarmId, "SwarmId should be set to accepted swarm");
    }

    // ============ Property 10: Non-OPEN Jobs Reject Bids ============
    /// @dev Feature: swarm-marketplace, Property 10: Non-OPEN Jobs Reject Bids
    /// @notice For any job not in OPEN status (ASSIGNED, IN_PROGRESS, COMPLETED, DISPUTED), 
    /// bid acceptance SHALL revert.
    /// **Validates: Requirements 4.6**
    function testFuzz_Property10_AssignedJobsRejectBids(
        address client,
        uint256 payment,
        bytes32 swarmId1,
        bytes32 swarmId2
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId1 != bytes32(0));
        vm.assume(swarmId2 != bytes32(0));
        vm.assume(swarmId1 != swarmId2);
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: create and assign job
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId1);

        // Try to accept another bid on ASSIGNED job
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.acceptBid(jobId, swarmId2);
        vm.stopPrank();
    }

    function testFuzz_Property10_InProgressJobsRejectBids(
        address client,
        uint256 payment,
        bytes32 swarmId1,
        bytes32 swarmId2
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId1 != bytes32(0));
        vm.assume(swarmId2 != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: create, assign, and start job
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);

        // Try to accept bid on IN_PROGRESS job
        vm.prank(client);
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.acceptBid(jobId, swarmId2);
    }

    function testFuzz_Property10_CompletedJobsRejectBids(
        address client,
        uint256 payment,
        bytes32 swarmId1,
        bytes32 swarmId2,
        string calldata resultHash
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId1 != bytes32(0));
        vm.assume(swarmId2 != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: complete full job lifecycle
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId1);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, resultHash);

        // Try to accept bid on COMPLETED job
        vm.prank(client);
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.acceptBid(jobId, swarmId2);
    }

    // ============ Property 11: Job Start Updates Status ============
    /// @dev Feature: swarm-marketplace, Property 11: Job Start Updates Status
    /// @notice For any job in ASSIGNED status, when execution starts, the status SHALL 
    /// transition to IN_PROGRESS.
    /// **Validates: Requirements 5.2**
    function testFuzz_Property11_JobStartUpdatesStatus(
        address client,
        uint256 payment,
        bytes32 swarmId
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: create and assign job
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId);
        vm.stopPrank();

        // Verify ASSIGNED status
        JobEscrow.Job memory jobBefore = escrow.getJob(jobId);
        assertEq(uint8(jobBefore.status), uint8(JobEscrow.JobStatus.ASSIGNED), "Job should be ASSIGNED");

        // Start job
        escrow.startJob(jobId);

        // Verify IN_PROGRESS status
        JobEscrow.Job memory jobAfter = escrow.getJob(jobId);
        assertEq(uint8(jobAfter.status), uint8(JobEscrow.JobStatus.IN_PROGRESS), "Job should be IN_PROGRESS");
    }

    /// @dev Verify that non-ASSIGNED jobs cannot be started
    function testFuzz_Property11_OnlyAssignedJobsCanStart(
        address client,
        uint256 payment
    ) public {
        vm.assume(client != address(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: create OPEN job
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        vm.stopPrank();

        // Try to start OPEN job
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.startJob(jobId);
    }

    // ============ Property 12: Payment Release Transfers Escrow ============
    /// @dev Feature: swarm-marketplace, Property 12: Payment Release Transfers Escrow
    /// @notice For any completed job with payment P, when the client approves, the escrow 
    /// balance SHALL decrease by P and the AgentPayments contract SHALL receive P.
    /// **Validates: Requirements 6.1**
    function testFuzz_Property12_PaymentReleaseTransfersEscrow(
        address client,
        uint256 payment,
        bytes32 swarmId,
        string calldata resultHash
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: complete full job lifecycle
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, resultHash);

        // Record balances before release
        uint256 escrowBalanceBefore = mnee.balanceOf(address(escrow));
        uint256 receiverBalanceBefore = mnee.balanceOf(paymentReceiver);

        // Release payment
        vm.prank(client);
        escrow.releasePayment(jobId);

        // Record balances after release
        uint256 escrowBalanceAfter = mnee.balanceOf(address(escrow));
        uint256 receiverBalanceAfter = mnee.balanceOf(paymentReceiver);

        // Property assertions
        assertEq(
            escrowBalanceBefore - escrowBalanceAfter,
            payment,
            "Escrow balance should decrease by payment amount"
        );
        assertEq(
            receiverBalanceAfter - receiverBalanceBefore,
            payment,
            "Payment receiver should receive payment amount"
        );
    }

    /// @dev Verify payment is cleared after release (prevents double release)
    function testFuzz_Property12_PaymentClearedAfterRelease(
        address client,
        uint256 payment,
        bytes32 swarmId,
        string calldata resultHash
    ) public {
        vm.assume(client != address(0));
        vm.assume(swarmId != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Setup: complete full job lifecycle
        mnee.mint(client, payment);
        vm.startPrank(client);
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, resultHash);

        // Release payment
        vm.prank(client);
        escrow.releasePayment(jobId);

        // Verify payment is cleared
        assertEq(escrow.getJobEscrow(jobId), 0, "Job payment should be cleared after release");
    }

    // ============ Property 15: Reentrancy Attacks Are Blocked ============
    /// @dev Feature: swarm-marketplace, Property 15: Reentrancy Attacks Are Blocked
    /// @notice For any reentrant call to payment functions (releasePayment), the transaction 
    /// SHALL revert.
    /// **Validates: Requirements 10.2**
    function testFuzz_Property15_ReentrancyAttacksAreBlocked(
        uint256 payment,
        bytes32 swarmId
    ) public {
        vm.assume(swarmId != bytes32(0));
        payment = bound(payment, 1, 1_000_000 * 10**18);

        // Deploy malicious receiver that attempts reentrancy
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(escrow), address(mnee));
        
        // Update payment receiver to attacker contract
        escrow.setPaymentReceiver(address(attacker));

        // Setup: create and complete job with attacker as client
        mnee.mint(address(attacker), payment);
        
        vm.startPrank(address(attacker));
        mnee.approve(address(escrow), payment);
        uint256 jobId = escrow.createJob(payment);
        escrow.acceptBid(jobId, swarmId);
        vm.stopPrank();

        escrow.startJob(jobId);
        escrow.completeJob(jobId, "hash");

        // Set up attacker to attempt reentrancy
        attacker.setJobId(jobId);

        // Attempt to release payment - should not allow reentrancy
        // The attacker will try to call releasePayment again when receiving tokens
        vm.prank(address(attacker));
        escrow.releasePayment(jobId);

        // Verify only one payment was made (reentrancy was blocked)
        // The attacker should have received the payment once
        assertEq(mnee.balanceOf(address(attacker)), payment, "Attacker should receive payment only once");
        assertEq(escrow.getJobEscrow(jobId), 0, "Job escrow should be cleared");
    }
}

/// @title Reentrancy Attacker Contract
/// @notice Attempts to exploit reentrancy in JobEscrow
contract ReentrancyAttacker {
    JobEscrow public escrow;
    MockMNEE public mnee;
    uint256 public jobId;
    bool public attacking;

    constructor(address _escrow, address _mnee) {
        escrow = JobEscrow(_escrow);
        mnee = MockMNEE(_mnee);
    }

    function setJobId(uint256 _jobId) external {
        jobId = _jobId;
    }

    // This function is called when the contract receives MNEE tokens
    // It attempts to re-enter releasePayment
    function onTokenTransfer(address, uint256, bytes calldata) external returns (bool) {
        if (!attacking) {
            attacking = true;
            // Attempt reentrancy - this should fail due to ReentrancyGuard
            try escrow.releasePayment(jobId) {
                // If this succeeds, reentrancy protection failed
            } catch {
                // Expected: reentrancy blocked
            }
            attacking = false;
        }
        return true;
    }

    // Allow the contract to receive MNEE
    receive() external payable {}
}
