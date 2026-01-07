# SWARM Marketplace Demo Setup Guide

This guide explains how to set up the demo environment for the MNEE Hackathon presentation.

## Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database (Neon recommended)
3. Environment variables configured in `.env`
4. Deployed smart contracts on Sepolia testnet

## Demo Data Setup

### 1. Seed Demo Data

Run the demo seed script to create pre-defined swarms, jobs, and sample data:

```bash
cd swarm
npm run db:seed:demo
```

This creates:
- **3 Pre-defined Swarms:**
  - Customer Support Swarm (rating: 4.8)
  - Data Analysis Swarm (rating: 4.5)
  - Content Creation Swarm (rating: 4.6)

- **5 Sample Jobs:**
  - Handle Customer Refund Requests (OPEN, 100 MNEE)
  - Analyze Q4 Sales Data (OPEN, 250 MNEE)
  - Write Product Launch Blog Posts (OPEN, 150 MNEE)
  - Technical Support Ticket Resolution (ASSIGNED, 200 MNEE)
  - Market Research Report (COMPLETED, 500 MNEE)

- **Sample Bids** on all OPEN jobs
- **Transaction History** for completed jobs
- **Analytics Data** for the dashboard

### 2. Prepare Demo Wallet with MNEE Tokens

For the demo, you'll need a wallet with MNEE tokens on Sepolia testnet.

#### Option A: Use Existing MNEE Faucet (if available)
1. Visit the MNEE faucet (check hackathon Discord for link)
2. Connect your demo wallet
3. Request test MNEE tokens

#### Option B: Request from Hackathon Organizers
1. Contact MNEE hackathon organizers
2. Provide your demo wallet address
3. Request test tokens for demo purposes

#### Demo Wallet Addresses (from seed script)

**Swarm Owners:**
- Customer Support: `0x1234567890123456789012345678901234567001`
- Data Analysis: `0x1234567890123456789012345678901234567002`
- Content Creation: `0x1234567890123456789012345678901234567003`

**Job Clients:**
- Client 1: `0x1234567890123456789012345678901234567101`
- Client 2: `0x1234567890123456789012345678901234567102`
- Client 3: `0x1234567890123456789012345678901234567103`

> **Note:** For the live demo, use your actual MetaMask wallet address and ensure it has:
> - Sepolia ETH for gas fees
> - MNEE tokens for job payments

### 3. MNEE Token Contract

The MNEE token is deployed at:
```
0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF (Ethereum Sepolia)
```

To add MNEE to MetaMask:
1. Open MetaMask
2. Switch to Sepolia testnet
3. Click "Import tokens"
4. Enter contract address: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
5. Token symbol: MNEE
6. Decimals: 18

## Demo Scenarios

### Scenario 1: Business Posts a Job
1. Connect wallet as a business client
2. Navigate to "Post Job"
3. Fill in job details (title, description, payment)
4. Approve MNEE spending
5. Submit job to escrow
6. Show job appearing in marketplace

### Scenario 2: Swarm Bids on Job
1. Connect wallet as swarm owner
2. Browse marketplace for OPEN jobs
3. Select a job and view details
4. Submit a competitive bid
5. Show bid appearing on job page

### Scenario 3: Job Execution & Payment
1. As job client, accept a bid
2. Watch real-time progress visualization
3. See CrewAI agents working (Router → Worker → QA)
4. View payment distribution to agents
5. Highlight "96% cost reduction" metric

### Scenario 4: Analytics Dashboard
1. Navigate to Dashboard
2. Show total jobs, MNEE volume, active swarms
3. Display earnings charts
4. Highlight cost savings metric

## Key Demo Points

1. **Zero-Crypto UX**: Emphasize how easy it is for mainstream users
2. **96% Cost Reduction**: Show the cost comparison metric
3. **Real-time Visualization**: Demonstrate live payment flows
4. **Multi-Agent Coordination**: Show how agents collaborate
5. **On-Chain Payments**: Highlight MNEE stablecoin integration

## Troubleshooting

### Database Connection Issues
```bash
# Verify database URL
echo $DATABASE_URL

# Test connection
npx prisma db push
```

### Missing MNEE Balance
- Ensure wallet is on Sepolia network
- Check MNEE token is imported in MetaMask
- Request tokens from faucet or organizers

### Contract Interaction Failures
- Verify contract addresses in `.env`
- Ensure sufficient Sepolia ETH for gas
- Check contract deployment status on Etherscan

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://..."

# Blockchain
NEXT_PUBLIC_SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/..."
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="..."
NEXT_PUBLIC_SWARM_REGISTRY_ADDRESS="0x..."
NEXT_PUBLIC_JOB_ESCROW_ADDRESS="0x..."
NEXT_PUBLIC_AGENT_PAYMENTS_ADDRESS="0x..."

# Real-time
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
PUSHER_APP_ID="..."
PUSHER_SECRET="..."

# Redis (for job queue)
REDIS_URL="redis://..."

# CrewAI Agents
CREWAI_API_URL="http://localhost:8000"
```
