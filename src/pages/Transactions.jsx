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
  balances: { color: '#4caf82', bg: 'var(--ok-bg)', border: 'var(--ok-border)' },
  staking:  { color: '#c9a84c', bg: 'var(--warn-bg)', border: 'var(--warn-border)' },
  contracts:{ color: '#5b8fe8', bg: 'var(--info-bg)', border: 'var(--info-border)' },
  identity: { color: '#a07ce8', bg: '#150d25', border: '#2d1a50' },
  assets:   { color: '#e8855b', bg: '#251508', border: '#503010' },
  bounties: { color: '#5be8c9', bg: '#081f1a', border: '#103d30' },
  timestamp:{ color: 'var(--text4)', bg: 'var(--bg2)', border: 'var(--border)' },
  default:  { color: 'var(--text2)', bg: 'var(--bg2)', border: 'var(--border)' },
}

function MethodBadge({ method, call }) {
  const c = METHOD_COLORS[method] || METHOD_COLORS.default
  return (
    <span title={`${method}.${call}`} style={{
      display: 'inline-block', maxWidth: '100%', padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
      color: c.color, background: c.bg, border: `0.5px solid ${c.border}`,
      fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      verticalAlign: 'middle',
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
          <div key={label} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text4)' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by method, block number, address, or hash..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
          onFocus={e => e.target.style.borderColor = '#c9a84c'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
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
              cursor: 'pointer', border: active ? `0.5px solid ${c.border}` : '0.5px solid var(--border)',
              background: active ? c.bg : 'var(--bg2)',
              color: active ? c.color : 'var(--text4)',
              fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}>{m}</button>
          )
        })}
        <button onClick={scanHistory} disabled={loading} style={{
          marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, fontSize: 12,
          background: 'var(--bg3)', border: '0.5px solid var(--border)', color: 'var(--text2)',
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
        }}>
          {loading ? 'Scanning...' : '↻ Refresh'}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '176px 56px minmax(0, 1fr) 104px 64px', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg1)' }}>
          {['Type', 'Block', 'Signer', 'Hash', 'Time'].map(h => (
            <div key={h} style={{ fontSize: 11, color: 'var(--text4)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, textAlign: h === 'Time' ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {displayTxs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text4)', fontFamily: 'JetBrains Mono, monospace' }}>
              {loading ? 'Scanning blocks...' : 'No transactions found'}
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {displayTxs.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: '176px 56px minmax(0, 1fr) 104px 64px',
                padding: '10px 16px', alignItems: 'center',
                borderBottom: i < displayTxs.length - 1 ? '0.5px solid var(--bg3)' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ minWidth: 0, overflow: 'hidden', paddingRight: 8 }}><MethodBadge method={tx.method} call={tx.call} /></div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c' }}>#{tx.block}</div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{tx.signer ? short(tx.signer) : '—'}</div>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text4)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{tx.hash ? short(tx.hash, 6) : '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', textAlign: 'right' }}>{timeAgo(tx.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 11, color: 'var(--text4)', fontFamily: 'JetBrains Mono, monospace' }}>
          {displayTxs.length} transactions · live updates every block
        </span>
      </div>
    </div>
  )
}
