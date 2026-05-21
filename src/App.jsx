import { useState } from 'react'
import { useChain } from './hooks/useChain'
import { Sidebar } from './components/Sidebar'
import { ChainHealth } from './pages/ChainHealth'
import { Profile } from './pages/Profile'
import { TokenStudio } from './pages/TokenStudio'
import { Transactions } from './pages/Transactions'
import { BountyBoard } from './pages/BountyBoard'
import { AiAssistant } from './pages/AiAssistant'
import { DeployContract } from './pages/DeployContract'
import './styles/global.css'

function ComingSoon({ title }) {
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ fontSize: 32 }}>⬡</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#8891a8' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#4a5266' }}>Coming soon</div>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState('health')
  const [wallet, setWallet] = useState(null)
  const chain = useChain()

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
      let balance = '0 POT'
      try { const bal = await chain.getBalance(address); if (bal) balance = bal.free } catch {}
      setWallet({ address, name, balance })
    } catch (err) { alert('Could not connect: ' + err.message) }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'health': return <ChainHealth chainInfo={chain.chainInfo} bestBlock={chain.bestBlock} finalizedBlock={chain.finalizedBlock} validators={chain.validators} treasury={chain.treasury} recentBlocks={chain.recentBlocks} recentTxs={chain.recentTxs} />
      case 'txs': return <Transactions api={chain.api} recentTxs={chain.recentTxs} bestBlock={chain.bestBlock} />
      case 'tokens': return <TokenStudio wallet={wallet} api={chain.api} getSigner={chain.getSigner} />
      case 'deploy': return <DeployContract wallet={wallet} api={chain.api} getSigner={chain.getSigner} />
      case 'bounty': return <BountyBoard wallet={wallet} api={chain.api} getSigner={chain.getSigner} />
      case 'ai': return <AiAssistant wallet={wallet} api={chain.api} recentTxs={chain.recentTxs} chainInfo={chain.chainInfo} bestBlock={chain.bestBlock} getSigner={chain.getSigner} />
      case 'profile': return <Profile wallet={wallet} api={chain.api} getBalance={chain.getBalance} getIdentity={chain.getIdentity} getSigner={chain.getSigner} />
      default: return <ComingSoon title={activePage} />
    }
  }

  const pageTitle = {
    health: 'Chain Health', txs: 'Transactions',
    tokens: 'Token Studio', deploy: 'Deploy Contract',
    bounty: 'Bounty Board', ai: 'AI Assistant', profile: 'My Profile',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={activePage} setActive={setActivePage} status={chain.status} wallet={wallet} onConnectWallet={connectWallet} />
      <main style={{ flex: 1, overflowY: 'auto', background: '#0e1117' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '14px 24px', background: '#0e1117', borderBottom: '0.5px solid #1e2433', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e2ea' }}>{pageTitle[activePage]}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {chain.bestBlock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#1a1508', border: '0.5px solid #3d3010', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c9a84c', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                #{chain.bestBlock.number.toLocaleString()}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: chain.status === 'connected' ? '#0d1f18' : '#1f0d0d', border: `0.5px solid ${chain.status === 'connected' ? '#1d3d2a' : '#3d1a1a'}`, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: chain.status === 'connected' ? '#4caf82' : '#e05c5c' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {chain.status === 'connected' ? 'Live' : chain.status === 'connecting' ? 'Connecting...' : 'Offline'}
            </div>
          </div>
        </div>
        {renderPage()}
      </main>
    </div>
  )
}
