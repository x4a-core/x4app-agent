import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi_x402 import init_x402, pay
from dotenv import load_dotenv
import os
import sys
import requests
import asyncio
import json
import base64

# --- Solana Dependencies ---
from solana.rpc.api import Client as SolanaClient
from solana.publickey import PublicKey
from solana.system_program import TransferParams, transfer
from solana.transaction import Transaction
from solders.instruction import Instruction as SoldersInstruction

# --- CDP Dependencies ---
try:
    from cdp import CdpClient 
except ImportError as e:
    print("\n" + "="*70)
    print("FATAL ERROR: CDP utility import failed. Check 'pip install cdp-sdk'.")
    print("="*70 + "\n")
    sys.exit(1)


# Load environment variables
load_dotenv()

# --- Network Setting ---
NETWORK = "solana" # Running on Solana Mainnet
SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com" # Mainnet RPC URL

# --- Configuration from .env ---
MERCHANT_WALLET = os.getenv("PAY_TO_ADDRESS", "").strip()
CDP_AGENT_ADDRESS = os.getenv("CDP_AGENT_SOLANA_ADDRESS", "").strip()
CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID", "").strip()
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET", "").strip()
CDP_WALLET_SECRET = os.getenv("CDP_WALLET_SECRET", "").strip()

# --- Global Check ---
if not all([MERCHANT_WALLET, CDP_AGENT_ADDRESS, CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET]):
    print("FATAL: Missing one or more required keys in .env. Cannot proceed with Mainnet.")
    sys.exit(1)

# --- FastAPI Setup ---
app = FastAPI(title="Zerebro X402 Demo Server (Solana Mainnet)")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize x402 middleware for the protected API endpoint
init_x402(app, merchant_wallet=MERCHANT_WALLET, network=NETWORK)


# ====================================================================
# --- ROUTE 1: Frontend Interface (Unprotected) ---
# ====================================================================
@app.get("/", response_class=HTMLResponse)
async def serve_frontend(request: Request):
    """Serves the main Zerebro client interface via the Node.js proxy."""
    return templates.TemplateResponse("index.html", {"request": request})


# ====================================================================
# --- ROUTE 2: Protected API Endpoint (Requires X402 Payment) ---
# ====================================================================
@app.get("/api/data-feed")
@pay("$0.01", asset="USDC", network=NETWORK) # Real $0.01 USDC charge on Solana Mainnet
async def premium_data_endpoint():
    """This endpoint only executes if the client's X-PAYMENT header is valid."""
    return {
        "data": "SUCCESS: Autonomous ZEREBRO agent data feed unlocked on SOLANA MAINNET.",
        "fee": "Paid $0.01 in USDC (Solana Mainnet)",
        "timestamp": "2025-10-27T08:20:00Z"
    }


# ====================================================================
# --- ROUTE 3: Zerebro Agent Runner (Handles the Client-Side Logic) ---
# ====================================================================
async def manual_x402_solana_flow():
    """Executes the manual X402 payment and returns the resource."""
    # 1. Initialize CDP Client and Solana RPC
    cdp = CdpClient(api_key_id=CDP_API_KEY_ID, api_key_secret=CDP_API_KEY_SECRET)
    solana_client = SolanaClient(SOLANA_RPC_URL)

    # 2. Agent (Zerebro) attempts to access the resource (First Request)
    # NOTE: The target URL is the FastAPI server, NOT the Node proxy.
    target_url = "http://127.0.0.1:8000/api/data-feed"
    
    first_response = requests.get(target_url)
    
    if first_response.status_code != 402:
        return first_response.json()

    # 3. Handle the 402 Payment Required Response
    payment_required_response = first_response.json()
    
    if not payment_required_response['accepts']:
        raise ValueError("Server returned 402 but no payment requirements were listed.")

    payment_requirements = payment_required_response['accepts'][0]
    pay_to_address = payment_requirements['payTo']
    
    # --- MANUAL SOLANA PAYMENT SIMULATION (Real Lamport Transfer for Demo) ---
    
    # a. Get recent blockhash
    blockhash_resp = solana_client.get_latest_blockhash()
    recent_blockhash = blockhash_resp.value.blockhash
    
    # b. Construct Transaction (Transfer the minimum possible 1 Lamport for a fee-only test)
    # A true X402 USDC payment requires a complex SPL-Token instruction, 
    # but this SOL transfer demonstrates the signing/retrial flow.
    lamports_to_send = 1 
    
    transaction = Transaction().add(
        transfer(
            TransferParams(
                from_pubkey=PublicKey(CDP_AGENT_ADDRESS),
                to_pubkey=PublicKey(pay_to_address),
                lamports=lamports_to_send
            )
        )
    )
    transaction.recent_blockhash = recent_blockhash
    transaction.fee_payer = PublicKey(CDP_AGENT_ADDRESS)
    
    # c. Serialize and sign the transaction using the CDP Server Wallet (Async operation)
    serialized_tx = transaction.serialize(require_all_signatures=False)
    serialized_tx_b64 = base64.b64encode(serialized_tx).decode('utf-8')
    
    sign_result = await cdp.solana.sign_transaction(
        address=CDP_AGENT_ADDRESS,
        transaction=serialized_tx_b64,
    )
    
    signed_tx_b64 = sign_result.signature
    
    # d. Build the X-PAYMENT Header (Protocol Requirement)
    payment_payload = {
        "x402Version": 1,
        "scheme": "exact", 
        "network": NETWORK,
        "payload": signed_tx_b64,
    }
    
    x_payment_header = base64.b64encode(json.dumps(payment_payload).encode('utf-8')).decode('utf-8')

    # 4. Agent Retries the Request with the X-PAYMENT header
    headers = {"X-PAYMENT": x_payment_header}
    final_response = requests.get(target_url, headers=headers)
    
    return final_response.json()


@app.get("/api/run-zerebro", response_class=JSONResponse)
async def run_zerebro_agent_wrapper():
    """Wrapper to run the asynchronous X402 payment flow."""
    try:
        # Run the manual asynchronous flow
        result = await manual_x402_solana_flow()
        return result
    except Exception as e:
        error_message = f"Wrapper Execution Error: {e}"
        # Print stack trace to console for debug
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": error_message})


if __name__ == "__main__":
    print(f"NETWORK: {NETWORK.upper()} MAINNET")
    print(f"Merchant Wallet: {MERCHANT_WALLET}")
    print(f"Agent Wallet (CDP Managed): {CDP_AGENT_ADDRESS}")
    print(f"Frontend URL (via Node Proxy): http://127.0.0.1:3000/")
    uvicorn.run(app, host="127.0.0.1", port=8000)