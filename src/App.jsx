import { useState, useEffect } from 'react'
import { useChain } from './hooks/useChain'
import { discoverEvmWallets, connectEvm as evmConnect, ensurePortaldotChain } from './evm/portaldotEvm'
import { Sidebar } from './components/Sidebar'
import { ChainHealth } from './pages/ChainHealth'
import { Profile } from './pages/Profile'
import { TokenStudio } from './pages/TokenStudio'
import { Transactions } from './pages/Transactions'
import { BountyBoard } from './pages/BountyBoard'
import { AiAssistant } from './pages/AiAssistant'
import { DeployContract } from './pages/DeployContract'
import './styles/global.css'

const NETWORKS = [
  { label: 'Portaldot Testnet V3', value: 'wss://test-node-v3.portaldot.dev' },
  { label: 'Local Node (127.0.0.1:9944)', value: 'ws://127.0.0.1:9944' },
]

const shortAddr = (a) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '')

// Top-bar wallet control: a status chip when connected, a connect button otherwise.
function WalletChip({ label, accent, connected, text, onConnect }) {
  if (connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'var(--bg2)', border: '0.5px solid var(--border)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: accent }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }} />
        {text}
      </div>
    )
  }
  return (
    <button onClick={onConnect} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'transparent', border: `0.5px solid ${accent}55`, fontSize: 12, color: accent, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', border: `1px solid ${accent}`, display: 'inline-block' }} />
      {label}
    </button>
  )
}

function ComingSoon({ title }) {
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⬡</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text2)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text4)' }}>Coming soon</div>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState('health')
  const [wallet, setWallet] = useState(null)
  const [evmWallet, setEvmWallet] = useState(null)
  const [rpc, setRpc] = useState('wss://test-node-v3.portaldot.dev')
  const [theme, setTheme] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('ph_theme')) || 'dark')
  const chain = useChain(rpc)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try { localStorage.setItem('ph_theme', theme) } catch {}
  }, [theme])

  const connectEvm = async () => {
    try {
      const wallets = await discoverEvmWallets()
      if (!wallets.length) {
        alert('No EVM wallet found. Install MetaMask (or another EVM wallet) and try again.')
        return
      }
      const picked = wallets[0]
      const { address, chainId, provider } = await evmConnect(picked.provider)
      try { await ensurePortaldotChain(provider) } catch {}
      setEvmWallet({ address, chainId, provider, name: picked.name })
    } catch (err) {
      alert('Could not connect EVM wallet: ' + (err?.message || err))
    }
  }

  const connectWallet = async () => {
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
      await web3Enable('PortalHouse')
      let address = null, name = 'Account'
      const injected = window.injectedWeb3 || {}
      for (const key of Object.keys(injected)) {
        try {
          const ext = await injected[key].enable('PortalHouse')
          const accs = await ext.accounts.get()
          if (accs.length > 0) { address = accs[0].address; name = accs[0].name || key; break }
        } catch {}
      }
      if (!address) {
        const accounts = await web3Accounts()
        if (accounts.length > 0) { address = accounts[0].address; name = accounts[0].meta?.name || 'Account' }
      }
      if (!address) {
        const addr = window.prompt('No accounts found.\n\nPaste your Portaldot address (starts with 5):')
        if (!addr) return
        address = addr.trim(); name = 'Manual'
      }
      let balance = `0 ${chain.tokenSymbol || 'tPOT'}`
      try { const bal = await chain.getBalance(address); if (bal) balance = bal.free } catch {}
      setWallet({ address, name, balance })
    } catch (err) { alert('Could not connect: ' + err.message) }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'health': return <ChainHealth chainInfo={chain.chainInfo} bestBlock={chain.bestBlock} finalizedBlock={chain.finalizedBlock} validators={chain.validators} treasury={chain.treasury} recentBlocks={chain.recentBlocks} recentTxs={chain.recentTxs} />
      case 'txs': return <Transactions api={chain.api} recentTxs={chain.recentTxs} bestBlock={chain.bestBlock} />
      case 'tokens': return <TokenStudio wallet={wallet} api={chain.api} getSigner={chain.getSigner} />
      case 'deploy': return <DeployContract wallet={wallet} api={chain.api} getSigner={chain.getSigner} evmWallet={evmWallet} onConnectEvm={connectEvm} decimals={chain.decimals} tokenSymbol={chain.tokenSymbol} />
      case 'bounty': return <BountyBoard wallet={wallet} api={chain.api} getSigner={chain.getSigner} decimals={chain.decimals} tokenSymbol={chain.tokenSymbol} />
      case 'ai': return <AiAssistant wallet={wallet} api={chain.api} recentTxs={chain.recentTxs} chainInfo={chain.chainInfo} bestBlock={chain.bestBlock} getSigner={chain.getSigner} decimals={chain.decimals} tokenSymbol={chain.tokenSymbol} />
      case 'profile': return <Profile wallet={wallet} api={chain.api} getBalance={chain.getBalance} getIdentity={chain.getIdentity} getSigner={chain.getSigner} />
      default: return <ComingSoon title={activePage} />
    }
  }

  const pageTitle = {
    health: 'Chain Health', txs: 'Transactions', tokens: 'Token Studio',
    deploy: 'Deploy Contract', bounty: 'Bounty Board', ai: 'AI Assistant', profile: 'My Profile',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={activePage} setActive={setActivePage} status={chain.status} chainInfo={chain.chainInfo} />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg1)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 24px', background: 'var(--bg1)', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{pageTitle[activePage]}</div>
            <select value={rpc} onChange={e => { setRpc(e.target.value); setWallet(null) }}
              style={{ padding: '4px 8px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text2)', outline: 'none', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}>
              {NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {chain.bestBlock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'var(--warn-bg)', border: '0.5px solid var(--warn-border)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c9a84c', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                #{chain.bestBlock.number.toLocaleString()}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: chain.status === 'connected' ? 'var(--ok-bg)' : 'var(--err-bg)', border: `0.5px solid ${chain.status === 'connected' ? 'var(--ok-border)' : 'var(--err-border)'}`, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: chain.status === 'connected' ? '#4caf82' : '#e05c5c' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {chain.status === 'connected' ? 'Live' : chain.status === 'connecting' ? 'Connecting...' : 'Offline'}
            </div>

            <WalletChip label="Connect Substrate" accent="#c9a84c" connected={!!wallet} text={wallet ? shortAddr(wallet.address) : ''} onConnect={connectWallet} />
            <WalletChip label="Connect EVM" accent="#5b8fe8" connected={!!evmWallet} text={evmWallet ? shortAddr(evmWallet.address) : ''} onConnect={connectEvm} />

            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
              style={{ width: 30, height: 30, borderRadius: 20, background: 'var(--bg2)', border: '0.5px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
        {renderPage()}
      </main>
    </div>
  )
}
