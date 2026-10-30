# PortalHouse

> Everything you need on Portaldot. Nothing you don't.

**Portaldot Mini Hackathon Online Season 1 Submission**

Live Demo: https://portalhouse.vercel.app

---

## Problem Statement

Portaldot has powerful native pallets — Assets, Identity, Bounties, Staking, Contracts, and more. But the only way to interact with them was raw Polkadot.js extrinsics. No dashboard. No explorer. No guidance. No AI.

PortalHouse fixes that. It is Portaldot's missing cockpit — one app that gives every developer, POT holder, and community member a home base for the chain.

## Solution

A full-stack React application connecting to the Portaldot node via WebSocket, with 7 working modules covering 8 native pallets. Every write action consumes real POT on-chain.

## Modules

| Module | What it does | Pallets |
|---|---|---|
| Chain Health | Live blocks, validators, tx feed | system, session |
| Transactions | Searchable tx history with filters | system, chain |
| Token Studio | Create, mint, burn, send custom tokens | assets, utility |
| Deploy Contract | Deploy ink! contracts via templates or custom WASM | contracts |
| Bounty Board | Post tasks with POT rewards, select winners | balances |
| AI Assistant | Natural language commands + profile analysis | balances, assets, identity |
| My Profile | Balance, on-chain identity, staking position | system, identity, staking |

> Connects by default to the live **Portaldot V3 testnet** (`wss://test-node-v3.portaldot.dev`). Native token: **tPOT** (14 decimals), specVersion 3002.

## How tPOT is Used as Gas

Every action that writes to the chain consumes real tPOT:
- Token creation: `api.tx.utility.batchAll` (assets.create + setMetadata + mint)
- POT transfer: `api.tx.balances.transferKeepAlive`
- Identity: `api.tx.identity.setIdentity` (deposit + gas)
- Bounty: `api.tx.balances.transferKeepAlive` (reward lock)
- AI commands: real extrinsics signed by user wallet

## AI Integration

The AI Assistant uses Groq (`openai/gpt-oss-120b` — free API tier).

**Judges can test with a free Groq key:**
1. Go to console.groq.com
2. Create free account → copy API key
3. In PortalHouse → AI Assistant → paste key when prompted

**What the AI can do:**
- Answer questions about Portaldot
- Execute transactions: "Send 10 POT to 5EHmLt..."
- Create tokens: "Create a token called QUAB with 5M supply"
- Analyze your wallet activity

## Tech Stack

- **Blockchain:** Portaldot V3 testnet (Substrate, specVersion 3002, tPOT / 14 decimals)
- **Frontend:** React 18 + Vite
- **Chain connection:** @polkadot/api WebSocket (`wss://test-node-v3.portaldot.dev`)
- **Wallet:** @polkadot/extension-dapp + direct injectedWeb3
- **AI:** Groq API (`openai/gpt-oss-120b`)
- **Deployment:** Vercel

## How to Run

**Requirements:** Node.js 20+, Portaldot dev node binary

```bash
# Terminal 1 — start node
./portaldot_dev --dev --alice --force-authoring --rpc-external --ws-external --rpc-cors all

# Terminal 2 — start app
npm install
npm run dev
# Open http://localhost:5176
```

**Get test POT:** Go to https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/accounts → Send from ALICE to your address.

**Windows (WSL2):** After getting your WSL2 IP with `hostname -I`, run in PowerShell (Admin):
```powershell
netsh interface portproxy add v4tov4 listenport=9944 listenaddress=127.0.0.1 connectport=9944 connectaddress=YOUR_WSL2_IP
```

## Demo

- Live: https://portalhouse.vercel.app
- Video: [link to be added]

## Roadmap

### Completed
- Live connection to the Portaldot V3 public testnet (default network)
- Chain Health Monitor with live subscriptions
- Transaction Explorer with search and filters
- Token Studio (create, mint, burn, send)
- Deploy Contract (templates + custom WASM upload)
- Bounty Board with creator-controlled winner selection
- AI Assistant with transaction execution
- My Profile with on-chain identity

### Next Phase
- Full ink! template deploys bundled with compiled WASM (custom WASM deploy is already live on V3)
- EVM/PolkaVM contract deploys via the revive pallet
- Staking interface with reward claiming
- NFT Studio using Uniques pallet

## Team

- **Name:** Investorquab (quabnation)
- **Role:** Builder + Technical Teaching Assistant, Portaldot Hackathon Season 1
- **Wallet:** 5EHmLtMFjM93319YfvTf34Q8cLcN8wPScFUfz5bsQc9pn3hm
- **GitHub:** github.com/Investorquab
- **Twitter:** @quabnation

## License

MIT

## For Judges — Testing Guide

### Option 1: Portaldot V3 Testnet (default — no setup needed)
1. Open https://portalhouse.vercel.app
2. It connects to **Portaldot Testnet V3** automatically (selected in the network dropdown)
3. Chain Health shows live blocks right away; Token Studio → Manage lists real on-chain assets
4. Connect your wallet (Portaldot or Polkadot.js extension)
5. For tPOT: ask in Portaldot Discord with your address

### Option 2: Local Node (full experience)
1. Download node: github.com/portaldotVolunteer/Portaldot-node
2. Run: `./portaldot_dev --dev --alice --force-authoring --rpc-external --ws-external --rpc-cors all`
3. Open https://portalhouse.vercel.app → select **Local Node**
4. Get tPOT: polkadot.js.org/apps → send from ALICE to your address

### AI Assistant
1. Get free Groq key at console.groq.com (30 seconds, no credit card)
2. Open AI Assistant → paste key when prompted
3. Try: "send 5 tPOT to [address]" or "create a token called TEST with 1M supply"

### Verified on-chain activity (builder wallet)
Address: 5EHmLtMFjM93319YfvTf34Q8cLcN8wPScFUfz5bsQc9pn3hm
- Identity set: quabnation / @quabnation
- Tokens created: QUAB, QTK, QUB and others
- POT transfers confirmed on-chain
