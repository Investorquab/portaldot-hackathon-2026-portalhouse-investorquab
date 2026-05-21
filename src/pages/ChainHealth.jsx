import { useState, useEffect } from 'react'

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: color || '#e0e2ea' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6b7591', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function short(hash) {
  if (!hash) return '—'
  return hash.slice(0, 8) + '...' + hash.slice(-6)
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'now'
  if (diff < 60) return `${diff}s ago`
  return `${Math.floor(diff / 60)}m ago`
}

const methodColor = (m) => {
  if (m === 'balances') return '#4caf82'
  if (m === 'staking') return '#c9a84c'
  if (m === 'contracts') return '#5b8fe8'
  if (m === 'identity') return '#a07ce8'
  return '#8891a8'
}

const methodBg = (m) => {
  if (m === 'balances') return '#0d1f18'
  if (m === 'staking') return '#1a1508'
  if (m === 'contracts') return '#0d1525'
  if (m === 'identity') return '#150d25'
  return '#1a1f2e'
}

const scrollStyle = {
  maxHeight: 220,
  overflowY: 'auto',
  paddingRight: 2,
}

export function ChainHealth({ chainInfo, bestBlock, finalizedBlock, validators, treasury, recentBlocks, recentTxs }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Best Block" value={bestBlock ? `#${bestBlock.number.toLocaleString()}` : '—'} sub="6s avg" color="#c9a84c" />
        <StatCard label="Finalized" value={finalizedBlock ? `#${finalizedBlock.number.toLocaleString()}` : '—'} sub="confirmed" color="#4caf82" />
        <StatCard label="Validators" value={validators.length || '—'} sub="active" color="#5b8fe8" />
        <StatCard label="Chain" value={chainInfo?.chain || '—'} sub={chainInfo?.version?.slice(0, 20) || ''} />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Recent Blocks */}
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, fontWeight: 600 }}>
            Recent Blocks
          </div>
          {recentBlocks.length === 0 ? (
            <div style={{ fontSize: 13, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>Waiting for blocks...</div>
          ) : (
            <div style={scrollStyle}>
              {recentBlocks.map((b, i) => (
                <div key={b.number} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0',
                  borderBottom: i < recentBlocks.length - 1 ? '0.5px solid #1a1f2e' : 'none',
                }}>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c', fontWeight: 600 }}>
                    #{b.number.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>
                    {short(b.hash)}
                  </span>
                  <span style={{ fontSize: 12, color: '#8891a8' }}>{timeAgo(b.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Validators */}
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, fontWeight: 600 }}>
            Active Validators
          </div>
          {validators.length === 0 ? (
            <div style={{ fontSize: 13, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>Loading validators...</div>
          ) : (
            <div style={scrollStyle}>
              {validators.map((v, i) => (
                <div key={v} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < validators.length - 1 ? '0.5px solid #1a1f2e' : 'none',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf82', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#c0c4d0' }}>
                    {v.slice(0, 12)}...{v.slice(-6)}
                  </span>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#4caf82', background: '#0d1f18', border: '0.5px solid #1d3d2a' }}>
                    active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Transactions */}
      <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
            Live Transactions
          </div>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        </div>
        {recentTxs.length === 0 ? (
          <div style={{ fontSize: 13, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>Waiting for transactions...</div>
        ) : (
          <div style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 2 }}>
            {recentTxs.map((tx, i) => (
              <div key={`${tx.id}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '9px 0',
                borderBottom: i < recentTxs.length - 1 ? '0.5px solid #1a1f2e' : 'none',
              }}>
                <span style={{
                  display: 'inline-flex', padding: '3px 10px', borderRadius: 4,
                  fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                  color: methodColor(tx.method),
                  background: methodBg(tx.method),
                  border: `0.5px solid ${methodColor(tx.method)}44`,
                  flexShrink: 0, fontWeight: 500,
                }}>
                  {tx.method}.{tx.call}
                </span>
                <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591', flex: 1 }}>
                  block #{tx.block}
                </span>
                <span style={{ fontSize: 12, color: '#8891a8' }}>{timeAgo(tx.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
