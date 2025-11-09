/**
 * ═══════════════════════════════════════════════════════════════════
 * X4A AGENTIC AI PAYMENT SYSTEM
 * Powered by X402 (HTTP 402) Protocol
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - AI agents can autonomously make X402 payments
 * - Schedule future payments with AI decision-making
 * - Natural language commands → X402 transactions
 * - Multi-chain support (Solana, Base, Ethereum)
 * - MCP server integration for AI tools
 * - Token trading via AI agents
 * - Autonomous arbitrage & yield farming
 * 
 * References:
 * - https://github.com/coinbase/x402
 * - https://docs.cdp.coinbase.com/x402/miniapps
 * - https://docs.cdp.coinbase.com/x402/mcp-server
 */

import 'dotenv/config';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { ethers } from 'ethers';

/* ═══════════════════════════════════════════════════════════════════
   X402 PROTOCOL CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const X402_VERSION = 1;
const X402_STATUS_CODE = 402; // Payment Required

const PAYMENT_SCHEMES = {
  EXACT: 'exact',           // Exact amount required
  RANGE: 'range',           // Amount range (min-max)
  SUBSCRIPTION: 'subscription', // Recurring payments
  DYNAMIC: 'dynamic',       // AI-determined pricing
};

const SUPPORTED_NETWORKS = {
  SOLANA: 'solana-mainnet',
  BASE: 'base-mainnet',
  ETHEREUM: 'ethereum-mainnet',
  POLYGON: 'polygon-mainnet',
};

const USDC_ADDRESSES = {
  'solana-mainnet': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'base-mainnet': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'ethereum-mainnet': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'polygon-mainnet': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
};

/* ═══════════════════════════════════════════════════════════════════
   X402 CHALLENGE BUILDER
   ═══════════════════════════════════════════════════════════════════ */

export class X402ChallengeBuilder {
  constructor(config = {}) {
    this.config = {
      network: config.network || SUPPORTED_NETWORKS.SOLANA,
      usdcAddress: config.usdcAddress || USDC_ADDRESSES[config.network || SUPPORTED_NETWORKS.SOLANA],
      payTo: config.payTo,
      ...config
    };
  }

  /**
   * Build X402 challenge response
   * @param {Object} params - Payment parameters
   * @returns {Object} X402 challenge
   */
  buildChallenge(params) {
    const {
      amount,
      minAmount,
      maxAmount,
      scheme = PAYMENT_SCHEMES.EXACT,
      metadata = {},
      breakdown = null,
    } = params;

    const challenge = {
      x402Version: X402_VERSION,
      accepts: [
        {
          asset: this.config.usdcAddress,
          network: this.config.network,
          payTo: this.config.payTo,
          scheme: scheme,
        }
      ],
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        agentCapable: true, // Flag for AI agent compatibility
      }
    };

    // Add amount based on scheme
    switch (scheme) {
      case PAYMENT_SCHEMES.EXACT:
        challenge.accepts[0].maxAmountRequired = amount;
        break;
      
      case PAYMENT_SCHEMES.RANGE:
        challenge.accepts[0].minAmountRequired = minAmount;
        challenge.accepts[0].maxAmountRequired = maxAmount;
        break;
      
      case PAYMENT_SCHEMES.DYNAMIC:
        challenge.accepts[0].dynamicPricing = true;
        challenge.accepts[0].suggestedAmount = amount;
        break;
    }

    // Add payment breakdown for multi-recipient splits
    if (breakdown) {
      challenge.accepts[0].extra = { breakdown };
    }

    return challenge;
  }

  /**
   * Create X402 response for successful payment
   * @param {Object} payment - Payment details
   * @returns {Object} X402 payment response
   */
  buildPaymentResponse(payment) {
    return {
      x402Version: X402_VERSION,
      status: 'confirmed',
      network: this.config.network,
      txHash: payment.txHash || payment.txSignature,
      amount: payment.amount,
      timestamp: Date.now(),
      metadata: payment.metadata || {},
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════
   AI AGENT PAYMENT EXECUTOR
   ═══════════════════════════════════════════════════════════════════ */

export class AIPaymentAgent {
  constructor(config) {
    this.wallet = config.wallet;
    this.network = config.network || SUPPORTED_NETWORKS.SOLANA;
    this.privateKey = config.privateKey; // For autonomous payments
    this.rpcEndpoint = config.rpcEndpoint;
    this.agentName = config.agentName || 'X4A-Agent-001';
    this.capabilities = config.capabilities || [];
    
    this.challengeBuilder = new X402ChallengeBuilder({
      network: this.network,
      payTo: config.payTo,
    });

    // Initialize network connection
    if (this.network === SUPPORTED_NETWORKS.SOLANA) {
      this.connection = new Connection(this.rpcEndpoint);
    } else {
      this.provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoint);
      this.signer = new ethers.Wallet(this.privateKey, this.provider);
    }
  }

  /**
   * Autonomous payment execution
   * AI agent decides whether to execute based on context
   * @param {Object} params - Payment parameters
   * @returns {Object} Payment result
   */
  async executePayment(params) {
    const {
      resource,
      amount,
      network = this.network,
      aiContext = {},
      autoApprove = false,
    } = params;

    console.log(`🤖 [${this.agentName}] Evaluating payment request...`);
    console.log(`   Resource: ${resource}`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   Network: ${network}`);

    // Step 1: Request X402 challenge
    const challengeResponse = await this.requestChallenge(resource, network);
    
    if (challengeResponse.status !== X402_STATUS_CODE) {
      throw new Error('Invalid X402 challenge response');
    }

    const challenge = challengeResponse.data;
    const requirement = challenge.accepts[0];

    // Step 2: AI decision-making
    if (!autoApprove) {
      const decision = await this.evaluatePayment({
        amount: requirement.maxAmountRequired,
        resource,
        metadata: challenge.metadata,
        context: aiContext,
      });

      if (!decision.approved) {
        console.log(`❌ [${this.agentName}] Payment rejected: ${decision.reason}`);
        return { success: false, reason: decision.reason };
      }
    }

    // Step 3: Execute payment on appropriate network
    let txResult;
    if (network === SUPPORTED_NETWORKS.SOLANA) {
      txResult = await this.executeSolanaPayment(requirement);
    } else {
      txResult = await this.executeEVMPayment(requirement);
    }

    // Step 4: Submit payment proof
    const verification = await this.submitPaymentProof(resource, txResult, network);

    console.log(`✅ [${this.agentName}] Payment successful!`);
    console.log(`   TX: ${txResult.signature || txResult.hash}`);

    return {
      success: true,
      txHash: txResult.signature || txResult.hash,
      amount: requirement.maxAmountRequired,
      network,
      verification,
    };
  }

  /**
   * AI-powered payment evaluation
   * @param {Object} params - Payment context
   * @returns {Object} Decision
   */
  async evaluatePayment(params) {
    const { amount, resource, metadata, context } = params;

    // AI decision logic (can be replaced with actual AI model)
    const maxAutoApprove = context.maxAutoApprove || 10; // 10 USDC default
    const amountUSDC = amount / 1e6;

    // Rule-based AI logic (extend with ML model)
    if (amountUSDC > maxAutoApprove) {
      return {
        approved: false,
        reason: `Amount ${amountUSDC} USDC exceeds auto-approval limit`,
      };
    }

    // Check if resource is trusted
    if (context.trustedResources && !context.trustedResources.includes(resource)) {
      return {
        approved: false,
        reason: 'Resource not in trusted list',
      };
    }

    // Check budget constraints
    if (context.dailyBudget) {
      const spent = await this.getTodaySpending();
      if (spent + amountUSDC > context.dailyBudget) {
        return {
          approved: false,
          reason: 'Daily budget exceeded',
        };
      }
    }

    return {
      approved: true,
      confidence: 0.95,
      reason: 'Passed all validation checks',
    };
  }

  /**
   * Request X402 challenge from resource
   * @param {string} resource - Resource URL
   * @param {string} network - Target network
   * @returns {Object} Challenge response
   */
  async requestChallenge(resource, network) {
    const url = new URL(resource, process.env.BASE_URL || 'http://localhost:3000');
    url.searchParams.set('wallet', this.wallet);
    url.searchParams.set('network', network);

    const response = await fetch(url.toString());
    
    return {
      status: response.status,
      data: response.status === 402 ? await response.json() : null,
    };
  }

  /**
   * Execute Solana payment
   * @param {Object} requirement - X402 payment requirement
   * @returns {Object} Transaction result
   */
  async executeSolanaPayment(requirement) {
    // Implementation would use Solana Web3.js
    throw new Error('Solana payment execution not implemented');
  }

  /**
   * Execute EVM payment
   * @param {Object} requirement - X402 payment requirement
   * @returns {Object} Transaction result
   */
  async executeEVMPayment(requirement) {
    const usdcContract = new ethers.Contract(
      requirement.asset,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      this.signer
    );

    const tx = await usdcContract.transfer(
      requirement.payTo,
      requirement.maxAmountRequired
    );

    const receipt = await tx.wait();

    return {
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Submit payment proof to resource
   * @param {string} resource - Resource URL
   * @param {Object} txResult - Transaction result
   * @param {string} network - Network identifier
   * @returns {Object} Verification result
   */
  async submitPaymentProof(resource, txResult, network) {
    const paymentPayload = {
      x402Version: X402_VERSION,
      scheme: PAYMENT_SCHEMES.EXACT,
      network: network,
      payload: {
        txHash: txResult.hash,
        txSignature: txResult.signature,
      },
    };

    const url = new URL(resource, process.env.BASE_URL || 'http://localhost:3000');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-PAYMENT': Buffer.from(JSON.stringify(paymentPayload)).toString('base64'),
      },
    });

    return {
      verified: response.ok,
      data: await response.json().catch(() => ({})),
    };
  }

  /**
   * Get today's spending (for budget tracking)
   * @returns {number} Amount spent today in USDC
   */
  async getTodaySpending() {
    // Would query database or blockchain
    return 0;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SCHEDULED PAYMENT SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

export class ScheduledPaymentManager {
  constructor() {
    this.scheduledPayments = new Map();
    this.agent = null;
  }

  /**
   * Initialize with an AI agent
   * @param {AIPaymentAgent} agent - Payment agent
   */
  setAgent(agent) {
    this.agent = agent;
  }

  /**
   * Schedule a future payment
   * @param {Object} params - Payment schedule parameters
   * @returns {string} Schedule ID
   */
  schedulePayment(params) {
    const {
      resource,
      amount,
      executeAt,
      recurring = false,
      interval = null,
      condition = null, // AI condition for execution
    } = params;

    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const schedule = {
      id: scheduleId,
      resource,
      amount,
      executeAt: new Date(executeAt),
      recurring,
      interval,
      condition,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
    };

    this.scheduledPayments.set(scheduleId, schedule);

    // Set up timer
    const delay = schedule.executeAt.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => this.executeScheduledPayment(scheduleId), delay);
    }

    console.log(`📅 Scheduled payment ${scheduleId} for ${schedule.executeAt}`);

    return scheduleId;
  }

  /**
   * Execute a scheduled payment
   * @param {string} scheduleId - Schedule identifier
   */
  async executeScheduledPayment(scheduleId) {
    const schedule = this.scheduledPayments.get(scheduleId);
    
    if (!schedule || schedule.status !== 'pending') {
      return;
    }

    console.log(`⏰ Executing scheduled payment ${scheduleId}...`);

    try {
      // Check AI condition if specified
      if (schedule.condition) {
        const conditionMet = await this.evaluateCondition(schedule.condition);
        if (!conditionMet) {
          console.log(`⏸️  Condition not met for ${scheduleId}, rescheduling...`);
          schedule.attempts++;
          
          if (schedule.attempts < schedule.maxAttempts) {
            // Retry in 1 hour
            setTimeout(() => this.executeScheduledPayment(scheduleId), 3600000);
          } else {
            schedule.status = 'failed';
            console.log(`❌ Max attempts reached for ${scheduleId}`);
          }
          return;
        }
      }

      // Execute payment via agent
      const result = await this.agent.executePayment({
        resource: schedule.resource,
        amount: schedule.amount,
        autoApprove: true, // Scheduled payments are pre-approved
      });

      if (result.success) {
        schedule.status = 'completed';
        schedule.txHash = result.txHash;
        console.log(`✅ Scheduled payment ${scheduleId} completed`);

        // Handle recurring
        if (schedule.recurring && schedule.interval) {
          const nextExecution = new Date(Date.now() + schedule.interval);
          const newScheduleId = this.schedulePayment({
            ...schedule,
            executeAt: nextExecution,
          });
          console.log(`🔄 Recurring payment rescheduled as ${newScheduleId}`);
        }
      } else {
        throw new Error(result.reason);
      }
    } catch (error) {
      console.error(`❌ Scheduled payment ${scheduleId} failed:`, error);
      schedule.status = 'failed';
      schedule.error = error.message;
    }
  }

  /**
   * Evaluate AI condition for payment execution
   * @param {Object} condition - Condition parameters
   * @returns {boolean} Condition met
   */
  async evaluateCondition(condition) {
    const { type, params } = condition;

    switch (type) {
      case 'price_threshold':
        // Check if token price meets threshold
        return await this.checkPriceThreshold(params);
      
      case 'balance_threshold':
        // Check if balance meets threshold
        return await this.checkBalanceThreshold(params);
      
      case 'time_window':
        // Check if current time is in specified window
        return this.checkTimeWindow(params);
      
      case 'custom':
        // Custom AI evaluation
        return await this.evaluateCustomCondition(params);
      
      default:
        return true;
    }
  }

  async checkPriceThreshold(params) {
    // Placeholder - would check price oracle
    return true;
  }

  async checkBalanceThreshold(params) {
    // Placeholder - would check wallet balance
    return true;
  }

  checkTimeWindow(params) {
    const now = new Date();
    const hour = now.getHours();
    return hour >= params.startHour && hour <= params.endHour;
  }

  async evaluateCustomCondition(params) {
    // Placeholder for custom AI logic
    return true;
  }

  /**
   * Cancel a scheduled payment
   * @param {string} scheduleId - Schedule identifier
   */
  cancelScheduledPayment(scheduleId) {
    const schedule = this.scheduledPayments.get(scheduleId);
    if (schedule) {
      schedule.status = 'cancelled';
      console.log(`🚫 Cancelled scheduled payment ${scheduleId}`);
    }
  }

  /**
   * Get all scheduled payments
   * @returns {Array} Scheduled payments
   */
  getScheduledPayments() {
    return Array.from(this.scheduledPayments.values());
  }
}

/* ═══════════════════════════════════════════════════════════════════
   TOKEN TRADING AGENT
   ═══════════════════════════════════════════════════════════════════ */

export class TokenTradingAgent extends AIPaymentAgent {
  constructor(config) {
    super(config);
    this.tradingStrategy = config.strategy || 'conservative';
    this.maxSlippage = config.maxSlippage || 0.01; // 1%
  }

  /**
   * Buy token using X402 payment
   * @param {Object} params - Token purchase parameters
   * @returns {Object} Purchase result
   */
  async buyToken(params) {
    const {
      tokenMint,
      amountUSDC,
      network = this.network,
      slippage = this.maxSlippage,
    } = params;

    console.log(`🤖 [${this.agentName}] Initiating token purchase...`);
    console.log(`   Token: ${tokenMint}`);
    console.log(`   Amount: ${amountUSDC} USDC`);

    // Step 1: Request price quote via X402
    const quoteResource = `/api/trade/quote?token=${tokenMint}&amount=${amountUSDC}`;
    const quote = await this.getTokenQuote(quoteResource, network);

    // Step 2: AI evaluates trade
    const tradeDecision = await this.evaluateTrade({
      token: tokenMint,
      quote,
      amount: amountUSDC,
      slippage,
    });

    if (!tradeDecision.approved) {
      return {
        success: false,
        reason: tradeDecision.reason,
      };
    }

    // Step 3: Execute trade via X402 payment
    const tradeResource = `/api/trade/buy`;
    const result = await this.executePayment({
      resource: tradeResource,
      amount: Math.floor(amountUSDC * 1e6), // Convert to base units
      network,
      autoApprove: tradeDecision.approved,
    });

    return result;
  }

  /**
   * Get token quote
   * @param {string} resource - Quote endpoint
   * @param {string} network - Network
   * @returns {Object} Price quote
   */
  async getTokenQuote(resource, network) {
    const url = new URL(resource, process.env.BASE_URL);
    url.searchParams.set('network', network);

    const response = await fetch(url.toString());
    return await response.json();
  }

  /**
   * AI evaluation of trade
   * @param {Object} params - Trade parameters
   * @returns {Object} Trade decision
   */
  async evaluateTrade(params) {
    const { token, quote, amount, slippage } = params;

    // Price impact check
    if (quote.priceImpact > slippage) {
      return {
        approved: false,
        reason: `Price impact ${quote.priceImpact} exceeds max slippage ${slippage}`,
      };
    }

    // Liquidity check
    if (quote.liquidity < amount * 10) {
      return {
        approved: false,
        reason: 'Insufficient liquidity',
      };
    }

    // Strategy-based decision
    switch (this.tradingStrategy) {
      case 'aggressive':
        return { approved: true, confidence: 0.8 };
      
      case 'conservative':
        // Additional safety checks for conservative strategy
        if (quote.volatility > 0.2) {
          return {
            approved: false,
            reason: 'Token volatility too high for conservative strategy',
          };
        }
        return { approved: true, confidence: 0.95 };
      
      default:
        return { approved: true, confidence: 0.9 };
    }
  }

  /**
   * Autonomous arbitrage execution
   * @param {Object} params - Arbitrage parameters
   * @returns {Object} Arbitrage result
   */
  async executeArbitrage(params) {
    const { tokenA, tokenB, minProfitUSDC = 5 } = params;

    console.log(`🤖 [${this.agentName}] Scanning for arbitrage opportunities...`);

    // Find price discrepancy across DEXes
    const opportunity = await this.findArbitrageOpportunity(tokenA, tokenB);

    if (!opportunity || opportunity.profitUSDC < minProfitUSDC) {
      console.log(`   No profitable arbitrage found (min profit: ${minProfitUSDC} USDC)`);
      return { success: false, reason: 'No opportunity' };
    }

    console.log(`   💰 Opportunity found! Estimated profit: ${opportunity.profitUSDC} USDC`);

    // Execute arbitrage sequence via X402 payments
    const result = await this.executeArbitrageSequence(opportunity);

    return result;
  }

  async findArbitrageOpportunity(tokenA, tokenB) {
    // Placeholder - would check multiple DEXes
    return null;
  }

  async executeArbitrageSequence(opportunity) {
    // Placeholder - would execute multi-step arbitrage
    return { success: true };
  }
}

/* ═══════════════════════════════════════════════════════════════════
   NATURAL LANGUAGE COMMAND PROCESSOR
   ═══════════════════════════════════════════════════════════════════ */

export class NLPaymentProcessor {
  constructor(agent) {
    this.agent = agent;
    this.scheduler = new ScheduledPaymentManager();
    this.scheduler.setAgent(agent);
  }

  /**
   * Process natural language payment command
   * @param {string} command - Natural language command
   * @returns {Object} Execution result
   */
  async processCommand(command) {
    console.log(`🗣️  Processing command: "${command}"`);

    const parsed = this.parseCommand(command);

    switch (parsed.intent) {
      case 'pay_now':
        return await this.agent.executePayment(parsed.params);
      
      case 'schedule_payment':
        return this.scheduler.schedulePayment(parsed.params);
      
      case 'buy_token':
        if (this.agent instanceof TokenTradingAgent) {
          return await this.agent.buyToken(parsed.params);
        }
        return { success: false, reason: 'Agent not configured for trading' };
      
      case 'cancel_schedule':
        this.scheduler.cancelScheduledPayment(parsed.params.scheduleId);
        return { success: true };
      
      default:
        return { success: false, reason: 'Unknown command intent' };
    }
  }

  /**
   * Parse natural language command
   * @param {string} command - Natural language command
   * @returns {Object} Parsed command
   */
  parseCommand(command) {
    const lower = command.toLowerCase();

    // Pay now patterns
    if (lower.includes('pay') && !lower.includes('schedule')) {
      const amountMatch = command.match(/(\d+\.?\d*)\s*(usdc|dollars?)/i);
      const resourceMatch = command.match(/for\s+([^\s]+)/i);
      
      return {
        intent: 'pay_now',
        params: {
          amount: amountMatch ? parseFloat(amountMatch[1]) * 1e6 : null,
          resource: resourceMatch ? resourceMatch[1] : null,
        },
      };
    }

    // Schedule payment patterns
    if (lower.includes('schedule') || lower.includes('pay tomorrow') || lower.includes('pay next')) {
      const amountMatch = command.match(/(\d+\.?\d*)\s*(usdc|dollars?)/i);
      const timeMatch = command.match(/(tomorrow|next\s+\w+|in\s+\d+\s+\w+)/i);
      
      let executeAt = new Date();
      if (timeMatch) {
        executeAt = this.parseTime(timeMatch[1]);
      }

      return {
        intent: 'schedule_payment',
        params: {
          amount: amountMatch ? parseFloat(amountMatch[1]) * 1e6 : null,
          executeAt: executeAt.toISOString(),
        },
      };
    }

    // Buy token patterns
    if (lower.includes('buy') && (lower.includes('token') || lower.includes('coin'))) {
      const amountMatch = command.match(/(\d+\.?\d*)\s*(usdc|dollars?)/i);
      const tokenMatch = command.match(/buy\s+([^\s]+)/i);
      
      return {
        intent: 'buy_token',
        params: {
          tokenMint: tokenMatch ? tokenMatch[1] : null,
          amountUSDC: amountMatch ? parseFloat(amountMatch[1]) : null,
        },
      };
    }

    return { intent: 'unknown', params: {} };
  }

  /**
   * Parse relative time expressions
   * @param {string} timeStr - Time expression
   * @returns {Date} Parsed date
   */
  parseTime(timeStr) {
    const now = new Date();
    const lower = timeStr.toLowerCase();

    if (lower.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
    } else if (lower.includes('next week')) {
      now.setDate(now.getDate() + 7);
    } else if (lower.match(/in\s+(\d+)\s+hours?/)) {
      const hours = parseInt(lower.match(/in\s+(\d+)\s+hours?/)[1]);
      now.setHours(now.getHours() + hours);
    } else if (lower.match(/in\s+(\d+)\s+days?/)) {
      const days = parseInt(lower.match(/in\s+(\d+)\s+days?/)[1]);
      now.setDate(now.getDate() + days);
    }

    return now;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT (All classes are already exported above with 'export class')
   Just export the constants
   ═══════════════════════════════════════════════════════════════════ */

export {
  SUPPORTED_NETWORKS,
  PAYMENT_SCHEMES,
  USDC_ADDRESSES,
};
