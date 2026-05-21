import { useState, useEffect } from 'react'

function short(addr, n = 10) {
  if (!addr) return '—'
  return addr.slice(0, n) + '...' + addr.slice(-6)
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const METHOD_COLORS = {
  balances: { color: '#4caf82', bg: '#0d1f18', border: '#1d3d2a' },
  staking:  { color: '#c9a84c', bg: '#1a1508', border: '#3d3010' },
  contracts:{ color: '#5b8fe8', bg: '#0d1525', border: '#1a2f50' },
  identity: { color: '#a07ce8', bg: '#150d25', border: '#2d1a50' },
  assets:   { color: '#e8855b', bg: '#251508', border: '#503010' },
  bounties: { color: '#5be8c9', bg: '#081f1a', border: '#103d30' },
  timestamp:{ color: '#4a5266', bg: '#111520', border: '#1e2433' },
  default:  { color: '#8891a8', bg: '#111520', border: '#1e2433' },
}

function MethodBadge({ method, call }) {
  const c = METHOD_COLORS[method] || METHOD_COLORS.default
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
      color: c.color, background: c.bg, border: `0.5px solid ${c.border}`,
      flexShrink: 0, fontWeight: 500,
    }}>
      {method}.{call}
    </span>
  )
}

export function Transactions({ api, recentTxs, bestBlock }) {
  const [txs, setTxs] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [scanDepth, setScanDepth] = useState(20)

  // Build tx list from recentTxs prop + historical scan
  useEffect(() => {
    if (recentTxs?.length > 0) {
      setTxs(prev => {
        const ids = new Set(prev.map(t => t.id))
        const newTxs = recentTxs.filter(t => !ids.has(t.id))
        return [...newTxs, ...prev].slice(0, 200)
      })
    }
  }, [recentTxs])

  // Scan historical blocks
  const scanHistory = async () => {
    if (!api || !bestBlock) return
    setLoading(true)
    const found = []
    const start = Math.max(1, bestBlock.number - scanDepth)
    for (let i = bestBlock.number; i >= start; i--) {
      try {
        const hash = await api.rpc.chain.getBlockHash(i)
        const block = await api.rpc.chain.getBlock(hash)
        const ts = block.block.extrinsics.find(e => e.method.section === 'timestamp')
        const time = ts ? parseInt(ts.method.args[0].toString()) : Date.now()
        block.block.extrinsics.forEach((ex, idx) => {
          found.push({
            id: `${i}-${idx}`,
            block: i,
            hash: hash.toHex(),
            method: ex.method.section,
            call: ex.method.method,
            signer: ex.signer?.toString() || null,
            time,
          })
        })
      } catch {}
    }
    setTxs(prev => {
      const ids = new Set(prev.map(t => t.id))
      const newOnes = found.filter(t => !ids.has(t.id))
      return [...prev, ...newOnes].sort((a, b) => b.block - a.block).slice(0, 200)
    })
    setLoading(false)
  }

  useEffect(() => {
    if (api && bestBlock) scanHistory()
  }, [api, bestBlock?.number])

  const methods = ['all', 'balances', 'assets', 'staking', 'contracts', 'identity', 'bounties']

  const filtered = txs.filter(tx => {
    if (filter !== 'all' && tx.method !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return tx.method.includes(s) || tx.call.includes(s) ||
        tx.block.toString().includes(s) ||
        (tx.signer && tx.signer.toLowerCase().includes(s)) ||
        (tx.hash && tx.hash.toLowerCase().includes(s))
    }
    return true
  })

  const nonTimestamp = filtered.filter(t => t.method !== 'timestamp')
  const showAll = filter === 'all' && !search
  const displayTxs = showAll ? filtered : nonTimestamp.length > 0 ? nonTimestamp : filtered

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Txs', value: txs.length },
          { label: 'Transfers', value: txs.filter(t => t.method === 'balances').length },
          { label: 'Asset Ops', value: txs.filter(t => t.method === 'assets').length },
          { label: 'Contracts', value: txs.filter(t => t.method === 'contracts').length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#e0e2ea' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a5266' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by method, block number, address, or hash..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
          onFocus={e => e.target.style.borderColor = '#c9a84c'}
          onBlur={e => e.target.style.borderColor = '#1e2433'}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {methods.map(m => {
          const c = METHOD_COLORS[m] || METHOD_COLORS.default
          const active = filter === m
          return (
            <button key={m} onClick={() => setFilter(m)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: active ? `0.5px solid ${c.border}` : '0.5px solid #1e2433',
              background: active ? c.bg : '#111520',
              color: active ? c.color : '#4a5266',
              fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}>{m}</button>
          )
        })}
        <button onClick={scanHistory} disabled={loading} style={{
          marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, fontSize: 12,
          background: '#1a1f2e', border: '0.5px solid #1e2433', color: '#8891a8',
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
          {loading ? 'Scanning...' : '↻ Refresh'}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 70px 1fr 100px 70px', padding: '10px 16px', borderBottom: '0.5px solid #1e2433', background: '#0e1117' }}>
          {['Type', 'Block', 'Signer', 'Hash', 'Time'].map(h => (
            <div key={h} style={{ fontSize: 11, color: '#4a5266', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {displayTxs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
              {loading ? 'Scanning blocks...' : 'No transactions found'}
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {displayTxs.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: '160px 70px 1fr 100px 70px',
                padding: '10px 16px', alignItems: 'center',
                borderBottom: i < displayTxs.length - 1 ? '0.5px solid #1a1f2e' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#131824'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div><MethodBadge method={tx.method} call={tx.call} /></div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c' }}>#{tx.block}</div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591' }}>{tx.signer ? short(tx.signer) : '—'}</div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>{tx.hash ? short(tx.hash, 8) : '—'}</div>
                <div style={{ fontSize: 12, color: '#8891a8' }}>{timeAgo(tx.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 11, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
          {displayTxs.length} transactions · live updates every block
        </span>
      </div>
    </div>
  )
}
