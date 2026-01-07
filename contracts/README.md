# SWARM Marketplace Smart Contracts

Smart contracts for the SWARM AI Agent Marketplace, enabling businesses to hire AI agent swarms paid in MNEE stablecoin on Ethereum.

## Contracts

### SwarmRegistry
Manages registration and metadata of AI agent swarms.
- Register swarms with agent addresses
- Add MNEE budget to swarms
- Track swarm ratings and activity status

### JobEscrow
Handles job creation, bidding, and payment escrow.
- Create jobs with MNEE escrow
- Accept bids from swarms
- Manage job lifecycle (OPEN → ASSIGNED → IN_PROGRESS → COMPLETED)
- Release payments on completion

### AgentPayments
Distributes MNEE payments to individual agents based on contribution shares.
- Share-based payment distribution
- Validates share percentages sum to 100%
- Handles rounding dust

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 18+ (for frontend integration)

## Setup

1. Clone the repository
2. Install dependencies:
```bash
forge install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Fill in your `.env` values:
- `SEPOLIA_RPC_URL`: Alchemy RPC URL for Sepolia
- `PRIVATE_KEY`: Deployer wallet private key
- `ETHERSCAN_API_KEY`: For contract verification

## Build

```bash
forge build
```

## Test

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-contract SwarmRegistryTest

# Check coverage
forge coverage --report summary
```

## Deploy to Sepolia

```bash
# Load environment variables
source .env

# Deploy and verify
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

## Contract Addresses (Sepolia)

After deployment, update these addresses:

| Contract | Address |
|----------|---------|
| MNEE Token | `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` |
| SwarmRegistry | TBD |
| JobEscrow | TBD |
| AgentPayments | TBD |

## Gas Optimization

The contracts implement several gas optimizations (Requirement 11):
- `bytes32` for swarmId instead of string
- `immutable` for constant addresses
- `unchecked` arithmetic for loop counters
- SafeERC20 for secure token transfers

## Security

- ReentrancyGuard on all payment functions
- Owner-only access control for swarm modifications
- Input validation on all public functions
- Events emitted for all state changes

## License

MIT
