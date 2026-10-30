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

export function Sidebar({ active, setActive, status, chainInfo }) {
  const dotColor = status === 'connected' ? '#4caf82' : status === 'connecting' ? '#c9a84c' : '#e05c5c'

  return (
    <aside style={{
      width: 210, flexShrink: 0,
      background: 'var(--bg0)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#c9a84c', letterSpacing: 0.3 }}>
          ⬡ PortalHouse
        </div>
        <div style={{ fontSize: 11, color: 'var(--text5)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
          Portaldot Network
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div style={{
              fontSize: 10, color: 'var(--text5)', letterSpacing: 1.5,
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
                  background: active === id ? 'var(--bg2)' : 'transparent',
                  border: 'none', borderLeft: active === id ? '2px solid #c9a84c' : '2px solid transparent',
                  color: active === id ? '#c9a84c' : 'var(--text3)',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (active !== id) { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.background = 'var(--bg1)' }}}
                onMouseLeave={e => { if (active !== id) { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'transparent' }}}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0, ...(status === 'connected' ? { animation: 'pulse 2s infinite' } : {}) }} />
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status === 'connected' ? (chainInfo?.chain || 'Connected') : status === 'connecting' ? 'Connecting...' : 'Node offline'}
          </span>
        </div>

      </div>
    </aside>
  )
}
