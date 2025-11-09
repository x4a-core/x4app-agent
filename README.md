# X4A - AI Agent Payment System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![X402 Protocol](https://img.shields.io/badge/X402-Payment%20Protocol-blue)](https://github.com/coinbase/x402)

> **Autonomous AI agents powered by X402 (HTTP 402) payment protocol**

X4A enables AI agents to autonomously make payments, schedule transactions, trade tokens, and access payment-gated resources using the X402 protocol. Perfect for building AI-driven financial applications, automated trading systems, and payment-enabled AI assistants.

## 🌟 Features

- **🤖 Autonomous Payments**: AI agents make payments independently based on context
- **🗣️ Natural Language Commands**: "Pay 5 USDC for weather data" → executed automatically
- **⏰ Scheduled Payments**: Schedule future or recurring payments with AI decision-making
- **💱 Token Trading**: AI agents can trade tokens via DEX integration
- **⚡ Arbitrage Execution**: Autonomous arbitrage opportunity detection and execution
- **🔗 Multi-Chain Support**: Solana, Base, Ethereum, and Polygon
- **🔌 MCP Server**: Model Context Protocol integration for Claude, ChatGPT, and other AI assistants
- **🛡️ X402 Protocol**: Standards-compliant HTTP 402 payment challenges and proofs

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [API Reference](#-api-reference)
- [MCP Server](#-mcp-server)
- [Architecture](#-architecture)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- A Solana/Base/Ethereum wallet
- USDC tokens for payments

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/x4a-ai-agent.git
cd x4a-ai-agent

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Basic Usage

```javascript
import { AIPaymentAgent, SUPPORTED_NETWORKS } from './x402-ai-agent.js';

// Create an AI payment agent
const agent = new AIPaymentAgent({
  wallet: 'YOUR_WALLET_ADDRESS',
  network: SUPPORTED_NETWORKS.SOLANA,
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  payTo: 'RECIPIENT_ADDRESS',
  agentName: 'MyAgent-001',
});

// Execute a payment autonomously
const result = await agent.executePayment({
  resource: '/api/premium-data',
  amount: 5 * 1e6, // 5 USDC (in base units)
  autoApprove: false, // AI will evaluate before paying
});

console.log('Payment successful:', result.txHash);
```

## 📦 Installation

### Using npm

```bash
npm install @solana/web3.js ethers dotenv express
npm install @modelcontextprotocol/sdk
```

### Using yarn

```bash
yarn add @solana/web3.js ethers dotenv express
yarn add @modelcontextprotocol/sdk
```

## ⚙️ Configuration

Create a `.env` file in your project root:

```env
# Network Configuration
RPC_ENDPOINT=https://api.mainnet-beta.solana.com
NETWORK=solana-mainnet

# Wallet Configuration (NEVER commit these to git)
# WALLET_ADDRESS=your_wallet_address_here
# PRIVATE_KEY=your_private_key_here

# Payment Configuration
X402_PAY_TO_ADDRESS=recipient_wallet_address
TREASURY_WALLET=your_treasury_address

# USDC Token Addresses (mainnet)
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# API Configuration
BASE_URL=http://localhost:3000
PORT=3000

# AI Agent Configuration
MAX_AUTO_APPROVE_AMOUNT=10
DAILY_BUDGET_USDC=100
```

### Security Best Practices

⚠️ **IMPORTANT**: Never commit sensitive data to version control

1. Always use `.env` files for sensitive configuration
2. Add `.env` to your `.gitignore`
3. Use environment variables in production
4. Rotate keys regularly
5. Use separate wallets for testing and production

## 💡 Usage Examples

### 1. Natural Language Payment Commands

```javascript
import { NLPaymentProcessor, TokenTradingAgent } from './x402-ai-agent.js';

const agent = new TokenTradingAgent({
  wallet: 'YOUR_WALLET',
  network: 'solana-mainnet',
  rpcEndpoint: process.env.RPC_ENDPOINT,
});

const processor = new NLPaymentProcessor(agent);

// Natural language commands
await processor.processCommand('Pay 5 USDC for weather data');
await processor.processCommand('Buy 10 USDC worth of SOL token');
await processor.processCommand('Schedule payment of 20 USDC tomorrow');
```

### 2. Scheduled Payments

```javascript
import { ScheduledPaymentManager } from './x402-ai-agent.js';

const scheduler = new ScheduledPaymentManager();
scheduler.setAgent(agent);

// Schedule one-time payment
const scheduleId = scheduler.schedulePayment({
  resource: '/api/subscription',
  amount: 10 * 1e6, // 10 USDC
  executeAt: new Date('2025-11-10T12:00:00Z').toISOString(),
});

// Schedule recurring payment
scheduler.schedulePayment({
  resource: '/api/monthly-service',
  amount: 50 * 1e6, // 50 USDC
  executeAt: new Date().toISOString(),
  recurring: true,
  interval: 30 * 24 * 60 * 60 * 1000, // 30 days
});
```

### 3. Token Trading

```javascript
import { TokenTradingAgent } from './x402-ai-agent.js';

const tradingAgent = new TokenTradingAgent({
  wallet: 'YOUR_WALLET',
  network: 'solana-mainnet',
  rpcEndpoint: process.env.RPC_ENDPOINT,
  strategy: 'conservative', // or 'aggressive'
});

// Buy token with AI evaluation
const result = await tradingAgent.buyToken({
  tokenMint: 'TOKEN_MINT_ADDRESS',
  amountUSDC: 100,
  slippage: 0.01, // 1% max slippage
});

console.log('Trade executed:', result.txHash);
```

### 4. Arbitrage Execution

```javascript
// AI agent finds and executes arbitrage opportunities
const arbitrageResult = await tradingAgent.executeArbitrage({
  tokenA: 'TOKEN_A_MINT',
  tokenB: 'TOKEN_B_MINT',
  minProfitUSDC: 5, // Minimum 5 USDC profit
});

if (arbitrageResult.success) {
  console.log('Arbitrage profit:', arbitrageResult.profitUSDC, 'USDC');
}
```

### 5. X402 Challenge Building

```javascript
import { X402ChallengeBuilder, PAYMENT_SCHEMES } from './x402-ai-agent.js';

const challengeBuilder = new X402ChallengeBuilder({
  network: 'solana-mainnet',
  usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  payTo: 'RECIPIENT_ADDRESS',
});

// Create exact payment challenge
const challenge = challengeBuilder.buildChallenge({
  amount: 5 * 1e6, // 5 USDC
  scheme: PAYMENT_SCHEMES.EXACT,
  metadata: {
    type: 'api_access',
    resource: '/api/premium-data',
  },
});

// Return as 402 response
res.status(402).json(challenge);
```

## 🛣️ API Reference

### Express.js Routes

#### POST `/api/agent/command`
Process natural language payment commands.

```javascript
POST /api/agent/command
Content-Type: application/json

{
  "command": "Pay 5 USDC for weather data",
  "wallet": "YOUR_WALLET_ADDRESS",
  "network": "solana-mainnet",
  "context": {
    "maxAutoApprove": 10,
    "trustedResources": ["/api/weather"]
  }
}
```

#### POST `/api/agent/buy-token`
Execute token purchase via AI agent.

```javascript
POST /api/agent/buy-token
Content-Type: application/json

{
  "tokenMint": "TOKEN_MINT_ADDRESS",
  "amountUSDC": 10,
  "wallet": "YOUR_WALLET_ADDRESS",
  "network": "solana-mainnet",
  "slippage": 0.01
}
```

#### POST `/api/agent/schedule`
Schedule a future payment.

```javascript
POST /api/agent/schedule
Content-Type: application/json

{
  "resource": "/api/subscription",
  "amount": 10,
  "executeAt": "2025-11-10T12:00:00Z",
  "recurring": false,
  "wallet": "YOUR_WALLET_ADDRESS"
}
```

#### GET `/api/agent/schedules`
Get all scheduled payments.

```javascript
GET /api/agent/schedules
```

#### DELETE `/api/agent/schedule/:id`
Cancel a scheduled payment.

```javascript
DELETE /api/agent/schedule/schedule_123456
```

#### GET `/api/agent/status/:wallet`
Get agent status for a wallet.

```javascript
GET /api/agent/status/YOUR_WALLET_ADDRESS
```

#### GET `/api/trade/quote`
Get token price quote.

```javascript
GET /api/trade/quote?token=TOKEN_MINT&amount=10&network=solana-mainnet
```

#### GET `/api/trade/buy`
Execute trade (with X402 payment).

```javascript
GET /api/trade/buy?token=TOKEN_MINT&amount=10&wallet=YOUR_WALLET
X-Payment: BASE64_ENCODED_PAYMENT_PROOF
```

#### GET `/api/agent/health`
Health check endpoint.

```javascript
GET /api/agent/health
```

### Core Classes

See [API.md](./docs/API.md) for detailed class documentation.

## 🔌 MCP Server

The Model Context Protocol (MCP) server enables AI assistants like Claude to interact with the X402 payment system.

### Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "x4a-payments": {
      "command": "node",
      "args": ["/path/to/x402-mcp-server.js"],
      "env": {
        "RPC_ENDPOINT": "https://api.mainnet-beta.solana.com",
        "X402_PAY_TO_ADDRESS": "your_address"
      }
    }
  }
}
```

### Available MCP Tools

- `x402_pay_resource` - Make payment to access resource
- `x402_schedule_payment` - Schedule future payment
- `x402_buy_token` - Purchase tokens
- `x402_check_status` - Check payment/schedule status
- `x402_cancel_schedule` - Cancel scheduled payment
- `x402_natural_language` - Process NL commands
- `x402_get_quote` - Get price quotes
- `x402_execute_arbitrage` - Execute arbitrage

See [MCP.md](./docs/MCP.md) for detailed documentation.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│              (Web App, Mobile, AI Assistant)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js API Server                     │
│                   (x402-agent-routes.js)                     │
├─────────────────────────────────────────────────────────────┤
│  • Natural Language Commands                                 │
│  • Token Trading Endpoints                                   │
│  • Schedule Management                                       │
│  • X402 Payment Handling                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                AI Agent Core (x402-ai-agent.js)             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌────────────────────────┐          │
│  │ AIPaymentAgent   │  │ TokenTradingAgent      │          │
│  │  • executePayment│  │  • buyToken            │          │
│  │  • evaluatePayment│ │  • executeArbitrage    │          │
│  └──────────────────┘  └────────────────────────┘          │
│                                                               │
│  ┌──────────────────┐  ┌────────────────────────┐          │
│  │ Scheduler        │  │ NLProcessor            │          │
│  │  • schedulePayment│ │  • processCommand      │          │
│  └──────────────────┘  └────────────────────────┘          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼             ▼
┌──────────────┐ ┌─────────┐ ┌─────────────┐
│   Solana     │ │  Base   │ │  Ethereum   │
│   Network    │ │ Network │ │   Network   │
└──────────────┘ └─────────┘ └─────────────┘
```

### Component Overview

1. **Express API Server** - HTTP endpoints for client interactions
2. **AI Agent Core** - Autonomous payment decision-making
3. **X402 Challenge Builder** - Payment protocol implementation
4. **Scheduled Payment Manager** - Time-based execution
5. **Natural Language Processor** - Command interpretation
6. **Multi-Chain Support** - Cross-chain payment execution

## 🔒 Security

### Best Practices

1. **Never commit private keys** - Use environment variables
2. **Validate all inputs** - Sanitize user input and payment amounts
3. **Rate limiting** - Implement rate limits on payment endpoints
4. **Amount limits** - Set max auto-approval amounts
5. **Audit logging** - Log all payment decisions and executions
6. **Multi-signature** - Use multi-sig wallets for large amounts
7. **Test thoroughly** - Test on devnet before mainnet deployment

### Environment Variables Security

```bash
# Use separate .env files for different environments
.env.development
.env.staging
.env.production

# Never commit these files
echo ".env*" >> .gitignore

# Use secret management in production
# - AWS Secrets Manager
# - HashiCorp Vault
# - Google Secret Manager
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test on devnet
NETWORK=solana-devnet npm run test:integration
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [MCP Server Guide](./docs/MCP.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/yourusername/x4a-ai-agent.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Install dependencies
npm install

# Make your changes and test
npm test

# Commit with conventional commits
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Coinbase X402 Protocol](https://github.com/coinbase/x402)
- [Anthropic MCP](https://modelcontextprotocol.io/)
- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [Ethers.js](https://github.com/ethers-io/ethers.js)

## 📞 Support

- 📧 Email: support@yourproject.com
- 💬 Discord: [Join our community](https://discord.gg/yourserver)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/x4a-ai-agent/issues)
- 📖 Docs: [Documentation](https://docs.yourproject.com)

## 🗺️ Roadmap

- [x] X402 protocol implementation
- [x] Multi-chain support (Solana, Base, Ethereum)
- [x] MCP server integration
- [x] Natural language commands
- [x] Token trading
- [ ] Advanced AI models integration
- [ ] Risk management dashboard
- [ ] Real-time arbitrage scanning
- [ ] Yield farming automation
- [ ] Governance token integration
- [ ] Mobile SDK

---

**Built with ❤️ by the X4A team**

*Empowering AI agents with autonomous payment capabilities*
