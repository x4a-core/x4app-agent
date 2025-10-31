# X4A X402 USDC Paywall Gateway (Solana)

This project implements a complete **X402 Paywall Gateway** on the **Solana mainnet**, using **USDC** as the payment token. It establishes a "pay-to-access" or "micropayment-gated access" model, enabling both human users and autonomous AI agents to unlock premium digital resources by paying a small, exact amount on-chain.

This repository demonstrates the full lifecycle: from receiving a payment challenge to executing the on-chain transfer and receiving a cryptographically signed receipt for access.

---

## 🌟 Core Features

* **X402 Protocol Implementation:** Uses the standardized `402 Payment Required` status code and `X-PAYMENT` headers for a clear, machine-readable challenge/response flow.
* **Solana Mainnet & USDC:** Operates directly on the Solana Mainnet, utilizing the official USDC SPL Token for all transactions.
* **Tiered Pricing & Configuration:** Supports multiple access tiers (e.g., `Basic`, `Premium`, `AI Agent`) with configurable USDC prices.
* **Token-Gating Hybrid:** Includes optional logic to grant **free access** or a **discount** if the user's wallet holds a specified minimum balance of another SPL token.
* **Secure Key Management:** The facilitator server is built to support rotating signing keys for enhanced operational security.
* **Autonomous Agent Flow:** Includes an example of a server-side client (an AI agent runner) that automatically handles the 402 challenge, signs the required transaction using a key management service (CDP SDK), and retries the request for automated access.
* **Webhook Notifications:** Supports sending real-time webhooks for both successful paid and token-gated free unlocks.

---

## 🌐 Architecture and How It Works

The system is composed of a decoupled Node.js Facilitator and an optional Python API Server, orchestrated by the client-side `index.html`.

### 1. X402 Facilitator (`server.js`)

This is the core gateway that enforces the paywall.

| Endpoint | Role | Description |
| :--- | :--- | :--- |
| `/config` | **Public Data** | Returns all required configuration (RPC, USDC Mint, required `payTo` address, tier prices) to the client for payment preparation. |
| `/paywall` | **Paywall Core** | The protected resource. It executes the X402 protocol: 1) Checks for the `X-PAYMENT` header. 2) If missing, returns a **`402 Payment Required`** challenge with payment details. 3) If the header is present, it verifies the Solana transaction for the exact required amount, asset, and recipient. 4) If verified, it returns the content and a signed **X402 Receipt** in the `X-PAYMENT-RESPONSE` header. |
| `/x402-meta` | **Metadata** | Provides structured metadata for payment explorers or aggregators. |

### 2. Client-Side Payment (`index.html`)

This component is responsible for the user-facing interaction:

1.  **Configuration:** Fetches network and pricing data from `/config`.
2.  **Challenge:** Requests `/paywall?tier=...` and receives the **402 challenge**.
3.  **Payment Construction:** Uses the connected Solana wallet to construct a **SPL Transfer Checked** instruction for the required USDC amount to the `payTo` address.
4.  **Transaction:** Signs the transaction and sends it to the Solana network, waiting for confirmation.
5.  **Retry:** Retries the original `/paywall` request, now including the **`X-PAYMENT` header** that contains the transaction signature.
6.  **Verification:** Verifies the cryptographic signature on the **X402 Receipt** returned by the server, ensuring the payment proof is authentic and untampered.

### 3. AI Agent Flow Example (`server.py`)

This Python/FastAPI server showcases the automated, server-to-server payment flow:

1.  The agent attempts to access the **protected endpoint** (`/api/data-feed`) and receives the 402 challenge.
2.  It uses the **CDP Client** (a placeholder for server-managed wallets/key systems) to remotely sign a payment transaction using the agent's associated key (`CDP_AGENT_SOLANA_ADDRESS`).
3.  The agent constructs the `X-PAYMENT` header using the signed transaction and retries the request, unlocking the premium data feed.

---

## 🛠️ Project Setup

### Prerequisites

* Node.js (for `server.js`)
* Python 3.x (for `server.py`)
* Solana-related libraries (handled by `package.json` and `server.py` requirements)

### Configuration

Create a `.env` file in the project root with the required configuration. **The `SERVER_WALLET_PRIVATE_KEY` must be set for the Node.js server to run.**

```env
# --- Node.js Facilitator (server.js) ---
PORT=3001
SOLANA_RPC=[https://api.mainnet-beta.solana.com](https://api.mainnet-beta.solana.com)
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# REQUIRED: The server's signing key (base58 or JSON array)
SERVER_WALLET_PRIVATE_KEY="<YOUR_BASE58_PRIVATE_KEY_HERE>"

# Pricing (base units: 1e6 = $1)
PRICE_BASIC_BASE=500
PRICE_PREMIUM_BASE=1000
PRICE_AI_AGENT_BASE=10000

# Token Gating (Optional)
GATE_MINT=
GATE_MIN_BALANCE=1
GATE_FREE=false

# Webhooks (Optional)
WEBHOOK_URL=
X402_WEBHOOK_SECRET=

# --- Python Agent Example (server.py) ---
# NOTE: This is for the agent runner demo only (not required for the Node.js paywall)
PAY_TO_ADDRESS="${SERVER_WALLET_PUBKEY_GOES_HERE}" # Public key from the private key above

# Agent's wallet (managed by the CDP system)
CDP_AGENT_SOLANA_ADDRESS="<AGENT_WALLET_PUBKEY_HERE>"
CDP_API_KEY_ID="<CDP_API_KEY_ID>"
CDP_API_KEY_SECRET="<CDP_API_KEY_SECRET>"
CDP_WALLET_SECRET="<CDP_WALLET_SECRET_FOR_AGENT>"
