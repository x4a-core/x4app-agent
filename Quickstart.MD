# 🚀 Quick Start Guide

Get started with X4A AI Agent in 5 minutes!

## Prerequisites

- Node.js >= 18.0.0
- A Solana/Base wallet
- Some USDC for testing

## Step 1: Install

```bash
# Clone the repository
git clone https://github.com/yourusername/x4a-ai-agent.git
cd x4a-ai-agent

# Install dependencies
npm install
```

## Step 2: Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Minimum configuration needed:**

```env
# Network
RPC_ENDPOINT=https://api.devnet.solana.com
NETWORK=solana-devnet

# Wallet (for testing on devnet)
WALLET_ADDRESS=your_devnet_wallet_address
X402_PAY_TO_ADDRESS=recipient_address

# USDC (devnet)
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# API
BASE_URL=http://localhost:3000
PORT=3000
```

⚠️ **Use devnet for testing! Never use mainnet credentials until you're ready.**

## Step 3: Basic Usage

### A. Simple Payment

```javascript
import { AIPaymentAgent, SUPPORTED_NETWORKS } from './x402-ai-agent.js';

// Create agent
const agent = new AIPaymentAgent({
  wallet: process.env.WALLET_ADDRESS,
  network: SUPPORTED_NETWORKS.SOLANA,
  rpcEndpoint: process.env.RPC_ENDPOINT,
  payTo: process.env.X402_PAY_TO_ADDRESS,
});

// Execute payment
const result = await agent.executePayment({
  resource: '/api/weather-data',
  amount: 5 * 1e6, // 5 USDC
  autoApprove: true, // Skip AI evaluation for testing
});

console.log('✅ Payment sent:', result.txHash);
```

### B. Natural Language Commands

```javascript
import { TokenTradingAgent, NLPaymentProcessor } from './x402-ai-agent.js';

// Create trading agent
const agent = new TokenTradingAgent({
  wallet: process.env.WALLET_ADDRESS,
  network: 'solana-devnet',
  rpcEndpoint: process.env.RPC_ENDPOINT,
});

// Process natural language commands
const processor = new NLPaymentProcessor(agent);

// Pay for something
await processor.processCommand('Pay 5 USDC for weather data');

// Buy tokens
await processor.processCommand('Buy 10 USDC worth of SOL token');

// Schedule payment
await processor.processCommand('Schedule payment of 20 USDC tomorrow');
```

### C. Start API Server

```javascript
// server.js
import express from 'express';
import agentRoutes from './x402-agent-routes.js';

const app = express();
app.use(express.json());
app.use('/api', agentRoutes);

app.listen(3000, () => {
  console.log('🚀 X4A API Server running on port 3000');
});
```

```bash
# Start the server
npm start

# Or with auto-reload
npm run dev
```

### D. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/agent/health

# Natural language command
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Pay 5 USDC for weather data",
    "wallet": "YOUR_WALLET_ADDRESS"
  }'

# Schedule payment
curl -X POST http://localhost:3000/api/agent/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "resource": "/api/premium-data",
    "amount": 10,
    "executeAt": "2025-11-10T12:00:00Z",
    "wallet": "YOUR_WALLET_ADDRESS"
  }'

# Get schedules
curl http://localhost:3000/api/agent/schedules

# Token quote
curl "http://localhost:3000/api/trade/quote?token=So11111111111111111111111111111111111111112&amount=10"
```

## Step 4: MCP Server (Optional)

### For Claude Desktop

1. **Install MCP server:**

```bash
# The server is already included
node x402-mcp-server.js
```

2. **Configure Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x4a-payments": {
      "command": "node",
      "args": ["/absolute/path/to/x402-mcp-server.js"],
      "env": {
        "RPC_ENDPOINT": "https://api.devnet.solana.com",
        "NETWORK": "solana-devnet",
        "X402_PAY_TO_ADDRESS": "your_recipient_address"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Try it out in Claude:**

```
Please use the x402_pay_resource tool to pay 5 USDC for /api/weather-data
```

## Step 5: Test Everything Works

### Payment Test

```javascript
// test-payment.js
import { AIPaymentAgent, SUPPORTED_NETWORKS } from './x402-ai-agent.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPayment() {
  const agent = new AIPaymentAgent({
    wallet: process.env.WALLET_ADDRESS,
    network: SUPPORTED_NETWORKS.SOLANA,
    rpcEndpoint: process.env.RPC_ENDPOINT,
    payTo: process.env.X402_PAY_TO_ADDRESS,
  });

  console.log('🧪 Testing payment...');
  
  try {
    const result = await agent.executePayment({
      resource: '/api/test',
      amount: 1 * 1e6, // 1 USDC
      autoApprove: true,
    });
    
    console.log('✅ Test passed!');
    console.log('TX:', result.txHash);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPayment();
```

```bash
# Run test
node test-payment.js
```

## Common Issues & Solutions

### Issue: "Connection refused"

**Solution:** Make sure you're using devnet RPC endpoint:
```env
RPC_ENDPOINT=https://api.devnet.solana.com
```

### Issue: "Insufficient funds"

**Solution:** Get devnet USDC from a faucet:
- Visit [Solana Faucet](https://faucet.solana.com/)
- Use devnet USDC faucets

### Issue: "Invalid wallet address"

**Solution:** Ensure your wallet address is valid for the network:
```javascript
// Solana addresses are base58 encoded
// Example: 7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV
```

### Issue: "Private key error"

**Solution:** Never commit private keys! Use environment variables:
```bash
# .env (NOT committed to git)
PRIVATE_KEY=your_key_here
```

### Issue: "Module not found"

**Solution:** Make sure you installed dependencies:
```bash
npm install
```

## Next Steps

1. **Read the full [README.md](./README.md)** for detailed documentation
2. **Check [API.md](./docs/API.md)** for API reference
3. **Review [SECURITY.md](./SECURITY.md)** for security best practices
4. **Join our [Discord](https://discord.gg/yourserver)** for support

## Example Projects

### 1. AI Weather Bot

```javascript
// weather-bot.js
import { AIPaymentAgent, NLPaymentProcessor } from './x402-ai-agent.js';

const agent = new AIPaymentAgent({
  wallet: process.env.WALLET_ADDRESS,
  network: 'solana-devnet',
  rpcEndpoint: process.env.RPC_ENDPOINT,
});

const processor = new NLPaymentProcessor(agent);

// Bot automatically pays for weather data
async function getWeather(city) {
  await processor.processCommand(`Pay 1 USDC for weather data for ${city}`);
  // Fetch weather data...
}

getWeather('New York');
```

### 2. Auto-Trading Bot

```javascript
// trading-bot.js
import { TokenTradingAgent } from './x402-ai-agent.js';

const bot = new TokenTradingAgent({
  wallet: process.env.WALLET_ADDRESS,
  network: 'solana-devnet',
  rpcEndpoint: process.env.RPC_ENDPOINT,
  strategy: 'conservative',
});

// Monitor and trade automatically
setInterval(async () => {
  const result = await bot.executeArbitrage({
    tokenA: 'SOL_MINT',
    tokenB: 'USDC_MINT',
    minProfitUSDC: 2,
  });
  
  if (result.success) {
    console.log('💰 Arbitrage profit:', result.profitUSDC);
  }
}, 60000); // Check every minute
```

### 3. Subscription Service

```javascript
// subscription.js
import { ScheduledPaymentManager } from './x402-ai-agent.js';

const scheduler = new ScheduledPaymentManager();
scheduler.setAgent(agent);

// Monthly subscription
scheduler.schedulePayment({
  resource: '/api/premium-service',
  amount: 50 * 1e6, // 50 USDC
  executeAt: new Date().toISOString(),
  recurring: true,
  interval: 30 * 24 * 60 * 60 * 1000, // 30 days
});
```

## Tips for Success

1. **Start with devnet** - Never test on mainnet
2. **Use small amounts** - Test with 1-5 USDC first
3. **Enable logging** - Set `LOG_LEVEL=debug` in .env
4. **Read error messages** - They're helpful!
5. **Check documentation** - Everything is documented
6. **Ask for help** - Join our Discord community

## Resources

- 📖 [Full Documentation](./README.md)
- 🔐 [Security Guide](./SECURITY.md)
- 🤝 [Contributing](./CONTRIBUTING.md)
- 🐛 [Report Issues](https://github.com/yourusername/x4a-ai-agent/issues)
- 💬 [Discord Community](https://discord.gg/yourserver)

---

**Ready to build? Let's go! 🚀**
