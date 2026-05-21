const NAV = [
  {
    section: 'Overview',
    items: [
      { id: 'health', label: 'Chain Health', icon: '📊' },
      { id: 'txs', label: 'Transactions', icon: '📋' },
    ]
  },
  {
    section: 'Build',
    items: [
      { id: 'tokens', label: 'Token Studio', icon: '🪙' },
      { id: 'deploy', label: 'Deploy Contract', icon: '📜' },
    ]
  },
  {
    section: 'Community',
    items: [
      { id: 'bounty', label: 'Bounty Board', icon: '🏆' },
    ]
  },
  {
    section: 'AI',
    items: [
      { id: 'ai', label: 'AI Assistant', icon: '🤖' },
    ]
  },
  {
    section: 'Account',
    items: [
      { id: 'profile', label: 'My Profile', icon: '👤' },
    ]
  },
]

export function Sidebar({ active, setActive, status, wallet, onConnectWallet }) {
  const dotColor = status === 'connected' ? '#4caf82' : status === 'connecting' ? '#c9a84c' : '#e05c5c'

  return (
    <aside style={{
      width: 210, flexShrink: 0,
      background: '#0a0d13',
      borderRight: '0.5px solid #1e2433',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid #1e2433' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#c9a84c', letterSpacing: 0.3 }}>
          ⬡ PortalHouse
        </div>
        <div style={{ fontSize: 11, color: '#2e3447', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
          Portaldot Network
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div style={{
              fontSize: 10, color: '#2e3447', letterSpacing: 1.5,
              textTransform: 'uppercase', padding: '12px 16px 4px',
            }}>
              {section}
            </div>
            {items.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 16px',
                  background: active === id ? '#111520' : 'transparent',
                  border: 'none', borderLeft: active === id ? '2px solid #c9a84c' : '2px solid transparent',
                  color: active === id ? '#c9a84c' : '#6b7591',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (active !== id) { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.background = '#0e1117' }}}
                onMouseLeave={e => { if (active !== id) { e.currentTarget.style.color = '#6b7591'; e.currentTarget.style.background = 'transparent' }}}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '0.5px solid #1e2433', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0, ...(status === 'connected' ? { animation: 'pulse 2s infinite' } : {}) }} />
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status === 'connected' ? 'ws://127.0.0.1:9944' : status === 'connecting' ? 'Connecting...' : 'Node offline'}
          </span>
        </div>

        {wallet ? (
          <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#4a5266', marginBottom: 3 }}>Connected</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
            </div>
            <div style={{ fontSize: 11, color: '#8891a8', marginTop: 2 }}>{wallet.balance}</div>
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            style={{
              width: '100%', padding: '8px', background: '#111520',
              border: '0.5px solid #2a3050', borderRadius: 8,
              fontSize: 12, color: '#c9a84c', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontWeight: 500,
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </aside>
  )
}
