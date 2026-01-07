/**
 * Demo Data Seed Script
 * 
 * Creates pre-defined swarms, sample jobs, and demo data for the SWARM Marketplace hackathon demo.
 * 
 * Usage: npx tsx scripts/seed-demo-data.ts
 * 
 * Requirements: Demo readiness (Task 14.1)
 */

import { PrismaClient, AgentRole, JobStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Use Prisma.Decimal for type compatibility
type Decimal = Prisma.Decimal;
const createDecimal = (value: string | number): Decimal => new Prisma.Decimal(value);

// Demo wallet addresses (these would be actual addresses in production)
const DEMO_WALLETS = {
  // Swarm owners
  customerSupportOwner: '0x1234567890123456789012345678901234567001',
  dataAnalysisOwner: '0x1234567890123456789012345678901234567002',
  contentCreationOwner: '0x1234567890123456789012345678901234567003',
  // Job clients
  client1: '0x1234567890123456789012345678901234567101',
  client2: '0x1234567890123456789012345678901234567102',
  client3: '0x1234567890123456789012345678901234567103',
  // Agent addresses
  agents: {
    router1: '0xA001000000000000000000000000000000000001',
    worker1: '0xA001000000000000000000000000000000000002',
    qa1: '0xA001000000000000000000000000000000000003',
    router2: '0xA002000000000000000000000000000000000001',
    worker2: '0xA002000000000000000000000000000000000002',
    qa2: '0xA002000000000000000000000000000000000003',
    router3: '0xA003000000000000000000000000000000000001',
    worker3: '0xA003000000000000000000000000000000000002',
    qa3: '0xA003000000000000000000000000000000000003',
  },
};

// Convert MNEE amount to Wei (18 decimals)
function toWei(amount: number): Decimal {
  return createDecimal(amount).mul(createDecimal(10).pow(18));
}

/**
 * Pre-defined Swarms for Demo
 */
const DEMO_SWARMS = [
  {
    name: 'Customer Support Swarm',
    description: 'AI-powered customer support team specializing in ticket resolution, FAQ handling, and customer satisfaction. Our swarm achieves 96% cost reduction compared to traditional support teams while maintaining high quality responses.',
    onChainId: '0x' + '1'.repeat(64), // bytes32
    owner: DEMO_WALLETS.customerSupportOwner,
    budget: toWei(5000),
    rating: 4.8,
    agents: [
      { address: DEMO_WALLETS.agents.router1, role: AgentRole.ROUTER },
      { address: DEMO_WALLETS.agents.worker1, role: AgentRole.WORKER },
      { address: DEMO_WALLETS.agents.qa1, role: AgentRole.QA },
    ],
  },
  {
    name: 'Data Analysis Swarm',
    description: 'Expert data analysis team capable of processing large datasets, generating insights, and creating visualizations. Specializes in business intelligence, market research, and predictive analytics.',
    onChainId: '0x' + '2'.repeat(64),
    owner: DEMO_WALLETS.dataAnalysisOwner,
    budget: toWei(3000),
    rating: 4.5,
    agents: [
      { address: DEMO_WALLETS.agents.router2, role: AgentRole.ROUTER },
      { address: DEMO_WALLETS.agents.worker2, role: AgentRole.WORKER },
      { address: DEMO_WALLETS.agents.qa2, role: AgentRole.QA },
    ],
  },
  {
    name: 'Content Creation Swarm',
    description: 'Creative content team for blog posts, social media content, marketing copy, and documentation. Delivers high-quality, SEO-optimized content with fast turnaround times.',
    onChainId: '0x' + '3'.repeat(64),
    owner: DEMO_WALLETS.contentCreationOwner,
    budget: toWei(2000),
    rating: 4.6,
    agents: [
      { address: DEMO_WALLETS.agents.router3, role: AgentRole.ROUTER },
      { address: DEMO_WALLETS.agents.worker3, role: AgentRole.WORKER },
      { address: DEMO_WALLETS.agents.qa3, role: AgentRole.QA },
    ],
  },
];

/**
 * Sample Jobs for Demo
 */
const DEMO_JOBS = [
  {
    title: 'Handle Customer Refund Requests',
    description: 'Process and respond to 50 customer refund requests. Each request needs to be evaluated based on our refund policy, and customers should receive personalized responses explaining the decision.',
    requirements: 'Must follow company refund policy guidelines. Response time should be under 24 hours. Maintain professional and empathetic tone.',
    payment: toWei(100),
    status: JobStatus.OPEN,
    clientAddr: DEMO_WALLETS.client1,
    onChainId: 1,
  },
  {
    title: 'Analyze Q4 Sales Data',
    description: 'Analyze our Q4 2025 sales data to identify trends, top-performing products, and areas for improvement. Generate a comprehensive report with visualizations.',
    requirements: 'Include year-over-year comparison. Identify top 10 products by revenue. Provide actionable recommendations.',
    payment: toWei(250),
    status: JobStatus.OPEN,
    clientAddr: DEMO_WALLETS.client2,
    onChainId: 2,
  },
  {
    title: 'Write Product Launch Blog Posts',
    description: 'Create 5 blog posts for our upcoming product launch. Posts should cover product features, use cases, customer benefits, and industry impact.',
    requirements: 'SEO-optimized with target keywords. 1000-1500 words each. Include meta descriptions and social media snippets.',
    payment: toWei(150),
    status: JobStatus.OPEN,
    clientAddr: DEMO_WALLETS.client3,
    onChainId: 3,
  },
  {
    title: 'Technical Support Ticket Resolution',
    description: 'Resolve 100 technical support tickets related to our SaaS platform. Issues range from login problems to feature questions.',
    requirements: 'Categorize tickets by severity. Escalate critical issues. Maintain 95% customer satisfaction rate.',
    payment: toWei(200),
    status: JobStatus.ASSIGNED,
    clientAddr: DEMO_WALLETS.client1,
    onChainId: 4,
  },
  {
    title: 'Market Research Report',
    description: 'Conduct comprehensive market research on the AI agent marketplace industry. Analyze competitors, market size, and growth opportunities.',
    requirements: 'Include SWOT analysis. Identify top 5 competitors. Project market size for next 5 years.',
    payment: toWei(500),
    status: JobStatus.COMPLETED,
    clientAddr: DEMO_WALLETS.client2,
    onChainId: 5,
    resultHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  },
];

async function seedDemoData() {
  console.log('🌱 Starting demo data seed...\n');

  try {
    // Clear existing demo data (optional - comment out to preserve data)
    console.log('🧹 Clearing existing demo data...');
    await prisma.bid.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.agent.deleteMany({});
    await prisma.swarm.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.analytics.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Swarms with Agents
    console.log('🐝 Creating demo swarms...');
    const createdSwarms: Record<string, string> = {};
    
    for (const swarmData of DEMO_SWARMS) {
      const swarm = await prisma.swarm.create({
        data: {
          name: swarmData.name,
          description: swarmData.description,
          onChainId: swarmData.onChainId,
          owner: swarmData.owner.toLowerCase(),
          budget: swarmData.budget,
          rating: swarmData.rating,
          isActive: true,
          agents: {
            create: swarmData.agents.map((agent) => ({
              address: agent.address.toLowerCase(),
              role: agent.role,
              earnings: toWei(Math.floor(Math.random() * 500)), // Random earnings for demo
              tasksCompleted: Math.floor(Math.random() * 50),
            })),
          },
        },
        include: {
          agents: true,
        },
      });
      
      createdSwarms[swarmData.name] = swarm.id;
      console.log(`  ✅ Created: ${swarm.name} (${swarm.agents.length} agents)`);
    }
    console.log('');

    // Create Jobs
    console.log('📋 Creating demo jobs...');
    const createdJobs: Record<number, string> = {};
    
    for (const jobData of DEMO_JOBS) {
      // Assign swarm for non-OPEN jobs
      let swarmId: string | undefined;
      if (jobData.status === JobStatus.ASSIGNED || jobData.status === JobStatus.COMPLETED) {
        swarmId = createdSwarms['Customer Support Swarm'];
      }

      const job = await prisma.job.create({
        data: {
          title: jobData.title,
          description: jobData.description,
          requirements: jobData.requirements,
          payment: jobData.payment,
          status: jobData.status,
          clientAddr: jobData.clientAddr.toLowerCase(),
          onChainId: jobData.onChainId,
          swarmId: swarmId,
          resultHash: jobData.resultHash,
          completedAt: jobData.status === JobStatus.COMPLETED ? new Date() : undefined,
        },
      });
      
      createdJobs[jobData.onChainId] = job.id;
      console.log(`  ✅ Created: ${job.title} (${job.status})`);
    }
    console.log('');

    // Create Bids for OPEN jobs
    console.log('💰 Creating demo bids...');
    const openJobs = DEMO_JOBS.filter(j => j.status === JobStatus.OPEN);
    
    for (const jobData of openJobs) {
      const jobId = createdJobs[jobData.onChainId];
      
      // Create 2-3 bids per open job from different swarms
      const swarmNames = Object.keys(createdSwarms);
      const numBids = Math.min(swarmNames.length, 2 + Math.floor(Math.random() * 2));
      
      for (let i = 0; i < numBids; i++) {
        const swarmName = swarmNames[i];
        const swarmId = createdSwarms[swarmName];
        
        // Vary the bid price slightly from the job payment
        const priceMultiplier = 0.8 + Math.random() * 0.4; // 80% to 120% of job payment
        const bidPrice = jobData.payment.mul(priceMultiplier).round();
        
        await prisma.bid.create({
          data: {
            jobId: jobId,
            swarmId: swarmId,
            price: bidPrice,
            estimatedTime: Math.floor(2 + Math.random() * 22), // 2-24 hours
            message: `We're excited to work on "${jobData.title}". Our team has extensive experience in this area and can deliver high-quality results.`,
            isAccepted: false,
          },
        });
        
        console.log(`  ✅ Bid from ${swarmName} on "${jobData.title}"`);
      }
    }
    console.log('');

    // Create sample transactions
    console.log('💸 Creating demo transactions...');
    
    // Job escrow transaction for completed job
    await prisma.transaction.create({
      data: {
        txHash: '0x' + 'a'.repeat(64),
        type: 'JOB_ESCROW',
        fromAddr: DEMO_WALLETS.client2.toLowerCase(),
        toAddr: 'escrow',
        amount: toWei(500),
        jobId: createdJobs[5],
        status: 'CONFIRMED',
        confirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    });
    console.log('  ✅ Job escrow transaction');

    // Payment release transaction
    await prisma.transaction.create({
      data: {
        txHash: '0x' + 'b'.repeat(64),
        type: 'PAYMENT_RELEASE',
        fromAddr: 'escrow',
        toAddr: createdSwarms['Customer Support Swarm'],
        amount: toWei(500),
        jobId: createdJobs[5],
        swarmId: createdSwarms['Customer Support Swarm'],
        status: 'CONFIRMED',
        confirmedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    });
    console.log('  ✅ Payment release transaction');

    // Agent payment transactions
    const customerSupportSwarm = await prisma.swarm.findUnique({
      where: { id: createdSwarms['Customer Support Swarm'] },
      include: { agents: true },
    });

    if (customerSupportSwarm) {
      for (const agent of customerSupportSwarm.agents) {
        const share = agent.role === AgentRole.WORKER ? 0.5 : 0.25;
        await prisma.transaction.create({
          data: {
            txHash: '0x' + 'c'.repeat(62) + agent.id.slice(-2),
            type: 'AGENT_PAYMENT',
            fromAddr: createdSwarms['Customer Support Swarm'],
            toAddr: agent.address,
            amount: toWei(500 * share),
            swarmId: createdSwarms['Customer Support Swarm'],
            status: 'CONFIRMED',
            confirmedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        });
      }
      console.log('  ✅ Agent payment transactions');
    }
    console.log('');

    // Create analytics data
    console.log('📊 Creating demo analytics...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.analytics.create({
      data: {
        date: today,
        totalJobs: 5,
        completedJobs: 1,
        totalMneeVolume: toWei(1200),
        activeSwarms: 3,
        avgCompletionTime: 4.5,
      },
    });
    console.log('  ✅ Analytics data created\n');

    // Summary
    console.log('🎉 Demo data seed completed successfully!\n');
    console.log('Summary:');
    console.log(`  • ${DEMO_SWARMS.length} Swarms created`);
    console.log(`  • ${DEMO_JOBS.length} Jobs created`);
    console.log(`  • ${openJobs.length * 2} Bids created`);
    console.log(`  • Sample transactions created`);
    console.log(`  • Analytics data created\n`);

    console.log('Demo Wallet Addresses:');
    console.log('  Swarm Owners:');
    console.log(`    Customer Support: ${DEMO_WALLETS.customerSupportOwner}`);
    console.log(`    Data Analysis: ${DEMO_WALLETS.dataAnalysisOwner}`);
    console.log(`    Content Creation: ${DEMO_WALLETS.contentCreationOwner}`);
    console.log('  Job Clients:');
    console.log(`    Client 1: ${DEMO_WALLETS.client1}`);
    console.log(`    Client 2: ${DEMO_WALLETS.client2}`);
    console.log(`    Client 3: ${DEMO_WALLETS.client3}`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedDemoData();
