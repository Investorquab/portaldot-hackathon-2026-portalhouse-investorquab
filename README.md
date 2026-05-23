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

## How POT is Used as Gas

Every action that writes to the chain consumes real POT:
- Token creation: `api.tx.utility.batchAll` (assets.create + setMetadata + mint)
- POT transfer: `api.tx.balances.transferKeepAlive`
- Identity: `api.tx.identity.setIdentity` (deposit + gas)
- Bounty: `api.tx.balances.transferKeepAlive` (reward lock)
- AI commands: real extrinsics signed by user wallet

## AI Integration

The AI Assistant uses Groq (Llama 3.3 70B — free API).

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

- **Blockchain:** Portaldot (Substrate, specVersion 1002)
- **Frontend:** React 18 + Vite
- **Chain connection:** @polkadot/api WebSocket
- **Wallet:** @polkadot/extension-dapp + direct injectedWeb3
- **AI:** Groq API (Llama 3.3 70B)
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
- Chain Health Monitor with live subscriptions
- Transaction Explorer with search and filters
- Token Studio (create, mint, burn, send)
- Deploy Contract (templates + custom WASM upload)
- Bounty Board with creator-controlled winner selection
- AI Assistant with transaction execution
- My Profile with on-chain identity

### Next Phase
- Real ink! contract integration (pending node upgrade to contracts API v9+)
- Public testnet connection when RPC endpoint is available
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
