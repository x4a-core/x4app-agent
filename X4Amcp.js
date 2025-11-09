/**
 * ═══════════════════════════════════════════════════════════════════
 * X4A MCP SERVER INTEGRATION
 * Model Context Protocol for AI Assistants
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Enables AI assistants (Claude, ChatGPT, etc.) to:
 * - Make X402 payments autonomously
 * - Access payment-gated resources
 * - Execute trades and marketplace actions
 * - Schedule future payments
 * 
 * Reference: https://docs.cdp.coinbase.com/x402/mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import {
  AIPaymentAgent,
  TokenTradingAgent,
  ScheduledPaymentManager,
  NLPaymentProcessor,
  X402ChallengeBuilder,
  SUPPORTED_NETWORKS,
} from './x402-ai-agent.js';

/* ═══════════════════════════════════════════════════════════════════
   MCP SERVER CONFIGURATION
   ═══════════════════════════════════════════════════════════════════ */

const MCP_SERVER_NAME = 'x4a-x402-payment-server';
const MCP_SERVER_VERSION = '1.0.0';

// Initialize AI agents
const agents = new Map();
const scheduler = new ScheduledPaymentManager();

/* ═══════════════════════════════════════════════════════════════════
   X402 MCP SERVER TOOLS
   ═══════════════════════════════════════════════════════════════════ */

const X402_TOOLS = [
  {
    name: 'x402_pay_resource',
    description: 'Make an X402 payment to access a protected resource. The AI can autonomously pay for data, APIs, or services.',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          description: 'Resource URL or endpoint (e.g., /api/weather, /tools/stock)',
        },
        amount: {
          type: 'number',
          description: 'Payment amount in USDC',
        },
        network: {
          type: 'string',
          enum: Object.values(SUPPORTED_NETWORKS),
          description: 'Blockchain network to use',
          default: SUPPORTED_NETWORKS.SOLANA,
        },
        wallet: {
          type: 'string',
          description: 'Wallet address for payment',
        },
        autoApprove: {
          type: 'boolean',
          description: 'Auto-approve payment without human confirmation',
          default: false,
        },
      },
      required: ['resource', 'wallet'],
    },
  },
  
  {
    name: 'x402_schedule_payment',
    description: 'Schedule a future X402 payment. Useful for recurring subscriptions or time-based payments.',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          description: 'Resource URL or endpoint',
        },
        amount: {
          type: 'number',
          description: 'Payment amount in USDC',
        },
        executeAt: {
          type: 'string',
          description: 'ISO 8601 datetime string (e.g., 2025-11-10T12:00:00Z)',
        },
        recurring: {
          type: 'boolean',
          description: 'Whether payment should recur',
          default: false,
        },
        interval: {
          type: 'number',
          description: 'Interval in milliseconds for recurring payments',
        },
        condition: {
          type: 'object',
          description: 'AI condition for payment execution',
        },
      },
      required: ['resource', 'amount', 'executeAt'],
    },
  },

  {
    name: 'x402_buy_token',
    description: 'Buy a token using USDC via X402 payment. AI can autonomously trade tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        tokenMint: {
          type: 'string',
          description: 'Token contract/mint address',
        },
        amountUSDC: {
          type: 'number',
          description: 'Amount of USDC to spend',
        },
        network: {
          type: 'string',
          enum: Object.values(SUPPORTED_NETWORKS),
          description: 'Network to use',
        },
        slippage: {
          type: 'number',
          description: 'Max slippage tolerance (0.01 = 1%)',
          default: 0.01,
        },
        wallet: {
          type: 'string',
          description: 'Wallet address',
        },
      },
      required: ['tokenMint', 'amountUSDC', 'wallet'],
    },
  },

  {
    name: 'x402_check_status',
    description: 'Check X402 payment or schedule status',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['payment', 'schedule', 'wallet'],
          description: 'Status type to check',
        },
        identifier: {
          type: 'string',
          description: 'Payment/schedule ID or wallet address',
        },
      },
      required: ['type', 'identifier'],
    },
  },

  {
    name: 'x402_cancel_schedule',
    description: 'Cancel a scheduled payment',
    inputSchema: {
      type: 'object',
      properties: {
        scheduleId: {
          type: 'string',
          description: 'Schedule identifier to cancel',
        },
      },
      required: ['scheduleId'],
    },
  },

  {
    name: 'x402_natural_language',
    description: 'Process natural language payment command. Example: "Pay 5 USDC for weather data" or "Buy 10 USDC worth of SOL token"',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Natural language payment command',
        },
        wallet: {
          type: 'string',
          description: 'Wallet address for execution',
        },
        context: {
          type: 'object',
          description: 'Additional context for AI decision-making',
        },
      },
      required: ['command', 'wallet'],
    },
  },

  {
    name: 'x402_get_quote',
    description: 'Get price quote for a resource or token without making payment',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          description: 'Resource URL or token mint',
        },
        type: {
          type: 'string',
          enum: ['resource', 'token'],
          description: 'Quote type',
        },
        network: {
          type: 'string',
          enum: Object.values(SUPPORTED_NETWORKS),
        },
      },
      required: ['resource', 'type'],
    },
  },

  {
    name: 'x402_execute_arbitrage',
    description: 'AI agent scans for and executes arbitrage opportunities automatically',
    inputSchema: {
      type: 'object',
      properties: {
        tokenA: {
          type: 'string',
          description: 'First token mint address',
        },
        tokenB: {
          type: 'string',
          description: 'Second token mint address',
        },
        minProfitUSDC: {
          type: 'number',
          description: 'Minimum profit threshold in USDC',
          default: 5,
        },
        wallet: {
          type: 'string',
          description: 'Wallet for execution',
        },
      },
      required: ['tokenA', 'tokenB', 'wallet'],
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   MCP SERVER TOOL HANDLERS
   ═══════════════════════════════════════════════════════════════════ */

async function handlePayResource(args) {
  const { resource, amount, network, wallet, autoApprove } = args;

  // Get or create agent for this wallet
  let agent = agents.get(wallet);
  if (!agent) {
    agent = new AIPaymentAgent({
      wallet,
      network: network || SUPPORTED_NETWORKS.SOLANA,
      rpcEndpoint: process.env.RPC_ENDPOINT,
      payTo: process.env.X402_PAY_TO_ADDRESS,
      agentName: `MCP-Agent-${wallet.slice(0, 8)}`,
    });
    agents.set(wallet, agent);
  }

  try {
    const result = await agent.executePayment({
      resource,
      amount: amount ? Math.floor(amount * 1e6) : undefined,
      network: network || SUPPORTED_NETWORKS.SOLANA,
      autoApprove,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            txHash: result.txHash,
            amount: result.amount,
            network: result.network,
            resourceData: result.verification?.data,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Payment failed: ${error.message}`
    );
  }
}

async function handleSchedulePayment(args) {
  const { resource, amount, executeAt, recurring, interval, condition } = args;

  try {
    const scheduleId = scheduler.schedulePayment({
      resource,
      amount: Math.floor(amount * 1e6),
      executeAt,
      recurring,
      interval,
      condition,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            scheduleId,
            executeAt,
            recurring,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to schedule payment: ${error.message}`
    );
  }
}

async function handleBuyToken(args) {
  const { tokenMint, amountUSDC, network, slippage, wallet } = args;

  // Get or create trading agent
  let agent = agents.get(`trading_${wallet}`);
  if (!agent) {
    agent = new TokenTradingAgent({
      wallet,
      network: network || SUPPORTED_NETWORKS.SOLANA,
      rpcEndpoint: process.env.RPC_ENDPOINT,
      payTo: process.env.X402_PAY_TO_ADDRESS,
      agentName: `TradingAgent-${wallet.slice(0, 8)}`,
      strategy: 'conservative',
    });
    agents.set(`trading_${wallet}`, agent);
  }

  try {
    const result = await agent.buyToken({
      tokenMint,
      amountUSDC,
      network,
      slippage,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            txHash: result.txHash,
            token: tokenMint,
            spent: amountUSDC,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Token purchase failed: ${error.message}`
    );
  }
}

async function handleCheckStatus(args) {
  const { type, identifier } = args;

  try {
    let status;

    switch (type) {
      case 'schedule':
        const schedule = scheduler.scheduledPayments.get(identifier);
        status = schedule || { error: 'Schedule not found' };
        break;

      case 'wallet':
        const agent = agents.get(identifier);
        status = agent ? { active: true, wallet: identifier } : { active: false };
        break;

      default:
        status = { error: 'Unknown status type' };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Status check failed: ${error.message}`
    );
  }
}

async function handleCancelSchedule(args) {
  const { scheduleId } = args;

  try {
    scheduler.cancelScheduledPayment(scheduleId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            scheduleId,
            status: 'cancelled',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to cancel schedule: ${error.message}`
    );
  }
}

async function handleNaturalLanguage(args) {
  const { command, wallet, context } = args;

  // Get or create agent
  let agent = agents.get(wallet);
  if (!agent) {
    agent = new TokenTradingAgent({
      wallet,
      network: SUPPORTED_NETWORKS.SOLANA,
      rpcEndpoint: process.env.RPC_ENDPOINT,
      payTo: process.env.X402_PAY_TO_ADDRESS,
      agentName: `NL-Agent-${wallet.slice(0, 8)}`,
    });
    agents.set(wallet, agent);
  }

  const processor = new NLPaymentProcessor(agent);

  try {
    const result = await processor.processCommand(command);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            command,
            result,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Command processing failed: ${error.message}`
    );
  }
}

async function handleGetQuote(args) {
  const { resource, type, network } = args;

  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    let url;

    if (type === 'token') {
      url = new URL('/api/trade/quote', baseUrl);
      url.searchParams.set('token', resource);
    } else {
      url = new URL(resource, baseUrl);
    }

    if (network) {
      url.searchParams.set('network', network);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get quote: ${error.message}`
    );
  }
}

async function handleExecuteArbitrage(args) {
  const { tokenA, tokenB, minProfitUSDC, wallet } = args;

  let agent = agents.get(`arbitrage_${wallet}`);
  if (!agent) {
    agent = new TokenTradingAgent({
      wallet,
      network: SUPPORTED_NETWORKS.SOLANA,
      rpcEndpoint: process.env.RPC_ENDPOINT,
      payTo: process.env.X402_PAY_TO_ADDRESS,
      agentName: `ArbitrageAgent-${wallet.slice(0, 8)}`,
      strategy: 'aggressive',
    });
    agents.set(`arbitrage_${wallet}`, agent);
  }

  try {
    const result = await agent.executeArbitrage({
      tokenA,
      tokenB,
      minProfitUSDC,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Arbitrage execution failed: ${error.message}`
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MCP SERVER INITIALIZATION
   ═══════════════════════════════════════════════════════════════════ */

const server = new Server(
  {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: X402_TOOLS,
}));

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'x402_pay_resource':
      return await handlePayResource(args);
    
    case 'x402_schedule_payment':
      return await handleSchedulePayment(args);
    
    case 'x402_buy_token':
      return await handleBuyToken(args);
    
    case 'x402_check_status':
      return await handleCheckStatus(args);
    
    case 'x402_cancel_schedule':
      return await handleCancelSchedule(args);
    
    case 'x402_natural_language':
      return await handleNaturalLanguage(args);
    
    case 'x402_get_quote':
      return await handleGetQuote(args);
    
    case 'x402_execute_arbitrage':
      return await handleExecuteArbitrage(args);
    
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

/* ═══════════════════════════════════════════════════════════════════
   START MCP SERVER
   ═══════════════════════════════════════════════════════════════════ */

async function runServer() {
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  console.error('✅ X4A X402 MCP Server running');
  console.error('📡 Available tools:', X402_TOOLS.map(t => t.name).join(', '));
}

runServer().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
