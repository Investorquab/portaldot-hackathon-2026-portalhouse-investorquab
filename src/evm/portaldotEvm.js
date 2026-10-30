// Dependency-free EVM layer for Portaldot V3 (mirrors PASTX's wallet approach,
// but using raw EIP-1193 / EIP-6963 provider calls instead of viem so the demo
// has no extra build dependencies). Handles wallet discovery, network add/switch,
// contract deploy via eth_sendTransaction, and receipt polling.

export const PORTALDOT_EVM = {
  chainId: 420420777,
  chainIdHex: '0x' + (420420777).toString(16), // 0x190f1ca9
  name: 'Portaldot V3',
  rpc: 'https://test-evm-rpc-v3.portaldot.dev',
  symbol: 'tPOT',
  decimals: 18,
  explorer: 'https://scanner-testnet-v3.portaldot.dev',
}

export const explorerTx = (hash) => `${PORTALDOT_EVM.explorer}/tx/${hash}`
export const explorerAddress = (addr) => `${PORTALDOT_EVM.explorer}/address/${addr}`

// EIP-6963 multi-wallet discovery, with a legacy window.ethereum fallback.
export function discoverEvmWallets(waitMs = 350) {
  const found = new Map()
  const onAnnounce = (e) => {
    const d = e.detail
    if (d?.info?.uuid) found.set(d.info.uuid, { name: d.info.name, icon: d.info.icon, rdns: d.info.rdns, provider: d.provider })
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
  }
  return new Promise((resolve) => setTimeout(() => {
    if (typeof window !== 'undefined') window.removeEventListener('eip6963:announceProvider', onAnnounce)
    const arr = Array.from(found.values())
    if (arr.length) return resolve(arr)
    const eth = typeof window !== 'undefined' ? window.ethereum : null
    if (eth) {
      const name = eth.isRabby ? 'Rabby' : (eth.isOkxWallet || eth.isOKExWallet) ? 'OKX Wallet' : eth.isMetaMask ? 'MetaMask' : 'Browser Wallet'
      return resolve([{ name, icon: '', rdns: 'injected', provider: eth }])
    }
    resolve([])
  }, waitMs))
}

export async function connectEvm(provider) {
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  if (!accounts?.length) throw new Error('No account authorized in the wallet.')
  const chainIdHex = await provider.request({ method: 'eth_chainId' })
  return { address: accounts[0], chainId: parseInt(chainIdHex, 16), provider }
}

// Make sure the wallet is on Portaldot V3, adding the network if it's unknown.
export async function ensurePortaldotChain(provider) {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: PORTALDOT_EVM.chainIdHex }] })
  } catch (err) {
    if (err?.code === 4902 || /Unrecognized chain|not been added/i.test(err?.message || '')) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: PORTALDOT_EVM.chainIdHex,
          chainName: PORTALDOT_EVM.name,
          nativeCurrency: { name: 'Portaldot Test', symbol: PORTALDOT_EVM.symbol, decimals: PORTALDOT_EVM.decimals },
          rpcUrls: [PORTALDOT_EVM.rpc],
          blockExplorerUrls: [PORTALDOT_EVM.explorer],
        }],
      })
    } else {
      throw err
    }
  }
}

// ABI-encode a single non-negative integer as a 32-byte word (uint256).
export function encodeUint256(value) {
  let n
  try { n = BigInt(String(value).trim() || '0') } catch { throw new Error('Enter a whole number') }
  if (n < 0n) throw new Error('Value must be zero or positive')
  return n.toString(16).padStart(64, '0')
}

// Estimate the gas + cost of deploying this data. Returns bigints.
export async function estimateDeploy(provider, from, data) {
  const [gasHex, priceHex] = await Promise.all([
    provider.request({ method: 'eth_estimateGas', params: [{ from, data }] }),
    provider.request({ method: 'eth_gasPrice', params: [] }),
  ])
  const gas = BigInt(gasHex)
  const gasPrice = BigInt(priceHex)
  return { gas, gasPrice, costWei: gas * gasPrice }
}

export async function getBalanceWei(provider, address) {
  const hex = await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] })
  return BigInt(hex)
}

// 18-decimal wei -> a short human string in tPOT.
export function formatTpot(wei, dp = 3) {
  const base = 10n ** 18n
  const whole = wei / base
  const frac = ((wei % base) * (10n ** BigInt(dp))) / base
  return `${whole}.${frac.toString().padStart(dp, '0')}`
}

// Deploy creation bytecode (+ already-encoded constructor args). Returns tx hash.
// Sets an explicit gas limit (estimate + 20%) so the wallet doesn't have to
// estimate it itself (some wallets choke on this chain's large gas values).
export async function deployBytecode(provider, from, bytecode, encodedArgsHex = '') {
  const data = bytecode + encodedArgsHex
  const tx = { from, data }
  try {
    const gasHex = await provider.request({ method: 'eth_estimateGas', params: [{ from, data }] })
    tx.gas = '0x' + ((BigInt(gasHex) * 12n) / 10n).toString(16)
  } catch { /* let the wallet estimate if the node refuses */ }
  return provider.request({ method: 'eth_sendTransaction', params: [tx] })
}

// Poll for the receipt; resolves with the deployed contract address.
export async function waitForContractAddress(provider, txHash, { tries = 40, intervalMs = 2000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [txHash] })
    if (receipt) {
      if (receipt.status && receipt.status !== '0x1') throw new Error('Transaction reverted on-chain')
      if (receipt.contractAddress) return receipt.contractAddress
      throw new Error('Deployed, but no contract address in receipt')
    }
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error('Timed out waiting for the transaction to be mined')
}

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—')
