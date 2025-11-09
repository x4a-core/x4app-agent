/**
 * ═══════════════════════════════════════════════════════════════════
 * X4A X402 AI AGENT API ROUTES
 * Express.js routes for AI agent payment interactions
 * ═══════════════════════════════════════════════════════════════════
 */

import express from 'express';
import {
  AIPaymentAgent,
  TokenTradingAgent,
  ScheduledPaymentManager,
  NLPaymentProcessor,
  X402ChallengeBuilder,
  SUPPORTED_NETWORKS,
  PAYMENT_SCHEMES,
} from './x402-ai-agent.js';

const router = express.Router();

/* ═══════════════════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════════════════ */

const agents = new Map();
const scheduler = new ScheduledPaymentManager();

const challengeBuilder = new X402ChallengeBuilder({
  network: SUPPORTED_NETWORKS.SOLANA,
  usdcAddress: process.env.USDC_MINT,
  payTo: process.env.X402_PAY_TO_ADDRESS || process.env.TREASURY_WALLET,
});

/* ═══════════════════════════════════════════════════════════════════
   HELPER: Get or create AI agent
   ═══════════════════════════════════════════════════════════════════ */

function getOrCreateAgent(wallet, network = SUPPORTED_NETWORKS.SOLANA, type = 'basic') {
  const key = `${type}_${wallet}_${network}`;
  
  if (agents.has(key)) {
    return agents.get(key);
  }

  const AgentClass = type === 'trading' ? TokenTradingAgent : AIPaymentAgent;
  
  const agent = new AgentClass({
    wallet,
    network,
    rpcEndpoint: process.env.RPC_ENDPOINT,
    payTo: process.env.X402_PAY_TO_ADDRESS || process.env.TREASURY_WALLET,
    agentName: `${type}-agent-${wallet.slice(0, 8)}`,
    capabilities: ['payment', 'schedule', type === 'trading' ? 'trade' : null].filter(Boolean),
  });

  agents.set(key, agent);
  return agent;
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: Natural Language Payment Command
   POST /api/agent/command
   ═══════════════════════════════════════════════════════════════════ */

router.post('/agent/command', async (req, res) => {
  try {
    const { command, wallet, network, context } = req.body;

    if (!command || !wallet) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: command, wallet',
      });
    }

    const agent = getOrCreateAgent(wallet, network, 'trading');
    const processor = new NLPaymentProcessor(agent);

    const result = await processor.processCommand(command);

    res.json({
      ok: true,
      command,
      result,
    });
  } catch (error) {
    console.error('❌ Command processing error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: AI Agent Buy Token
   POST /api/agent/buy-token
   ═══════════════════════════════════════════════════════════════════ */

router.post('/agent/buy-token', async (req, res) => {
  try {
    const { tokenMint, amountUSDC, wallet, network, slippage, autoApprove } = req.body;

    if (!tokenMint || !amountUSDC || !wallet) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: tokenMint, amountUSDC, wallet',
      });
    }

    const agent = getOrCreateAgent(wallet, network, 'trading');

    const result = await agent.buyToken({
      tokenMint,
      amountUSDC,
      network: network || SUPPORTED_NETWORKS.SOLANA,
      slippage: slippage || 0.01,
    });

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Buy token error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: Schedule Payment
   POST /api/agent/schedule
   ═══════════════════════════════════════════════════════════════════ */

router.post('/agent/schedule', async (req, res) => {
  try {
    const {
      resource,
      amount,
      executeAt,
      recurring,
      interval,
      condition,
      wallet,
      network,
    } = req.body;

    if (!resource || !amount || !executeAt || !wallet) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: resource, amount, executeAt, wallet',
      });
    }

    const agent = getOrCreateAgent(wallet, network);
    scheduler.setAgent(agent);

    const scheduleId = scheduler.schedulePayment({
      resource,
      amount: Math.floor(amount * 1e6),
      executeAt,
      recurring,
      interval,
      condition,
    });

    res.json({
      ok: true,
      scheduleId,
      executeAt,
      recurring,
    });
  } catch (error) {
    console.error('❌ Schedule payment error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: Get Scheduled Payments
   GET /api/agent/schedules
   ═══════════════════════════════════════════════════════════════════ */

router.get('/agent/schedules', (req, res) => {
  try {
    const schedules = scheduler.getScheduledPayments();

    res.json({
      ok: true,
      schedules: schedules.map(s => ({
        id: s.id,
        resource: s.resource,
        amount: s.amount / 1e6,
        executeAt: s.executeAt,
        status: s.status,
        recurring: s.recurring,
      })),
    });
  } catch (error) {
    console.error('❌ Get schedules error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: Cancel Schedule
   DELETE /api/agent/schedule/:id
   ═══════════════════════════════════════════════════════════════════ */

router.delete('/agent/schedule/:id', (req, res) => {
  try {
    const { id } = req.params;

    scheduler.cancelScheduledPayment(id);

    res.json({
      ok: true,
      scheduleId: id,
      status: 'cancelled',
    });
  } catch (error) {
    console.error('❌ Cancel schedule error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: AI Arbitrage Execution
   POST /api/agent/arbitrage
   ═══════════════════════════════════════════════════════════════════ */

router.post('/agent/arbitrage', async (req, res) => {
  try {
    const { tokenA, tokenB, minProfitUSDC, wallet, network } = req.body;

    if (!tokenA || !tokenB || !wallet) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: tokenA, tokenB, wallet',
      });
    }

    const agent = getOrCreateAgent(wallet, network, 'trading');

    const result = await agent.executeArbitrage({
      tokenA,
      tokenB,
      minProfitUSDC: minProfitUSDC || 5,
    });

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Arbitrage execution error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: AI Agent Status
   GET /api/agent/status/:wallet
   ═══════════════════════════════════════════════════════════════════ */

router.get('/agent/status/:wallet', (req, res) => {
  try {
    const { wallet } = req.params;

    const activeAgents = [];
    for (const [key, agent] of agents.entries()) {
      if (key.includes(wallet)) {
        activeAgents.push({
          type: key.split('_')[0],
          wallet: agent.wallet,
          network: agent.network,
          capabilities: agent.capabilities,
        });
      }
    }

    res.json({
      ok: true,
      wallet,
      agents: activeAgents,
      totalAgents: activeAgents.length,
    });
  } catch (error) {
    console.error('❌ Agent status error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: Token Quote (X402 Challenge)
   GET /api/trade/quote
   ═══════════════════════════════════════════════════════════════════ */

router.get('/api/trade/quote', async (req, res) => {
  try {
    const { token, amount, network } = req.query;

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: 'Missing token parameter',
      });
    }

    // Mock quote data (replace with actual DEX integration)
    const quote = {
      token,
      inputAmount: amount || '10',
      outputAmount: '0.095', // Example: 10 USDC → 0.095 SOL
      priceImpact: 0.002, // 0.2%
      liquidity: 150000, // $150k
      volatility: 0.15, // 15%
      estimatedFee: 0.001, // 0.1%
      network: network || SUPPORTED_NETWORKS.SOLANA,
    };

    res.json({
      ok: true,
      quote,
    });
  } catch (error) {
    console.error('❌ Quote error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: Execute Trade (X402 Payment)
   GET /api/trade/buy (triggers 402 challenge)
   ═══════════════════════════════════════════════════════════════════ */

router.get('/api/trade/buy', async (req, res) => {
  try {
    const { token, amount, wallet, network } = req.query;

    // Check if payment proof provided
    const paymentHeader = req.headers['x-payment'];

    if (!paymentHeader) {
      // No payment → return X402 challenge
      const challenge = challengeBuilder.buildChallenge({
        amount: Math.floor((amount || 10) * 1e6), // Default 10 USDC
        scheme: PAYMENT_SCHEMES.EXACT,
        metadata: {
          type: 'token_trade',
          token,
          trader: wallet,
          network: network || SUPPORTED_NETWORKS.SOLANA,
        },
      });

      return res.status(402).json(challenge);
    }

    // Payment provided → verify and execute trade
    const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());

    // TODO: Verify payment on-chain
    console.log('💰 Payment received:', payment);

    // Mock trade execution
    const tradeResult = {
      success: true,
      token,
      inputAmount: amount || 10,
      outputAmount: 0.095,
      txHash: payment.payload.txHash || payment.payload.txSignature,
      network: network || SUPPORTED_NETWORKS.SOLANA,
    };

    res.json({
      ok: true,
      trade: tradeResult,
    });
  } catch (error) {
    console.error('❌ Trade execution error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ROUTE: AI Agent Health Check
   GET /api/agent/health
   ═══════════════════════════════════════════════════════════════════ */

router.get('/agent/health', (req, res) => {
  res.json({
    ok: true,
    status: 'running',
    activeAgents: agents.size,
    scheduledPayments: scheduler.getScheduledPayments().length,
    supportedNetworks: Object.values(SUPPORTED_NETWORKS),
    capabilities: [
      'natural_language_commands',
      'scheduled_payments',
      'token_trading',
      'arbitrage_execution',
      'x402_payments',
    ],
  });
});

/* ═══════════════════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════════════════ */

export default router;
