import { useState, useEffect, useRef } from 'react'

function short(addr, n = 10) {
  if (!addr) return '—'
  return addr.slice(0, n) + '...' + addr.slice(-6)
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function ContractRegistry({ api, bestBlock }) {
  const [contracts, setContracts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [callResult, setCallResult] = useState(null)
  const [calling, setCalling] = useState(false)
  const seenRef = useRef(new Set())

  // Load existing contracts from chain storage
  const loadContracts = async () => {
    if (!api) return
    setLoading(true)
    try {
      // Query all contract info entries
      const entries = await api.query.contracts.contractInfoOf.entries()
      const loaded = entries.map(([key, val]) => {
        const address = key.args[0].toString()
        const info = val.unwrapOrDefault()
        return {
          address,
          codeHash: info.codeHash?.toHex() || '—',
          deployer: '—',
          block: '—',
          time: null,
          calls: 0,
        }
      })
      // Merge with any we found via events
      setContracts(prev => {
        const map = new Map()
        prev.forEach(c => map.set(c.address, c))
        loaded.forEach(c => {
          if (!map.has(c.address)) map.set(c.address, c)
          else map.set(c.address, { ...map.get(c.address), codeHash: c.codeHash })
        })
        return Array.from(map.values())
      })
    } catch (err) {
      console.error('Load contracts error:', err)
    }
    setLoading(false)
  }

  // Listen for new Instantiated events
  useEffect(() => {
    if (!api) return
    loadContracts()

    let unsub
    const subscribe = async () => {
      unsub = await api.query.system.events((events) => {
        events.forEach(({ event, phase }) => {
          if (event.section === 'contracts' && event.method === 'Instantiated') {
            const [deployer, contract] = event.data
            const address = contract.toString()
            if (seenRef.current.has(address)) return
            seenRef.current.add(address)

            setContracts(prev => {
              if (prev.find(c => c.address === address)) return prev
              return [{
                address,
                deployer: deployer.toString(),
                block: phase.isApplyExtrinsic ? '?' : '—',
                codeHash: '—',
                time: Date.now(),
                calls: 0,
              }, ...prev]
            })
          }
          if (event.section === 'contracts' && event.method === 'Called') {
            const contract = event.data[1]?.toString()
            if (contract) {
              setContracts(prev => prev.map(c =>
                c.address === contract ? { ...c, calls: (c.calls || 0) + 1 } : c
              ))
            }
          }
        })
      })
    }
    subscribe()
    return () => { if (unsub) unsub() }
  }, [api])

  // Reload when new block arrives
  useEffect(() => {
    if (bestBlock && api) loadContracts()
  }, [bestBlock?.number])

  const filtered = contracts.filter(c =>
    !search ||
    c.address.toLowerCase().includes(search.toLowerCase()) ||
    c.deployer.toLowerCase().includes(search.toLowerCase()) ||
    c.codeHash.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7591', marginTop: 4 }}>
            All ink! contracts deployed on the Portaldot chain — live via event subscription
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
          </span>
          <button onClick={loadContracts} style={{
            padding: '6px 12px', background: '#111520', border: '0.5px solid #1e2433',
            borderRadius: 6, fontSize: 12, color: '#8891a8', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a5266', fontSize: 14 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by address, deployer, or code hash..."
          style={{
            width: '100%', padding: '10px 12px 10px 36px',
            background: '#111520', border: '0.5px solid #1e2433',
            borderRadius: 8, fontSize: 13, color: '#e0e2ea',
            outline: 'none', fontFamily: 'JetBrains Mono, monospace',
          }}
          onFocus={e => e.target.style.borderColor = '#c9a84c'}
          onBlur={e => e.target.style.borderColor = '#1e2433'}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 80px',
          padding: '10px 16px', borderBottom: '0.5px solid #1e2433',
          background: '#0e1117',
        }}>
          {['Contract Address', 'Deployer', 'Block', 'Calls', ''].map(h => (
            <div key={h} style={{ fontSize: 11, color: '#4a5266', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading && contracts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
            Scanning chain for contracts...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📜</div>
            <div style={{ fontSize: 14, color: '#6b7591', marginBottom: 6 }}>
              {search ? 'No contracts match your search' : 'No contracts deployed yet'}
            </div>
            <div style={{ fontSize: 12, color: '#4a5266' }}>
              Deploy an ink! contract and it will appear here automatically
            </div>
          </div>
        ) : (
          filtered.map((c, i) => (
            <div
              key={c.address}
              onClick={() => setSelected(selected?.address === c.address ? null : c)}
              style={{
                borderBottom: i < filtered.length - 1 ? '0.5px solid #1a1f2e' : 'none',
                cursor: 'pointer',
                background: selected?.address === c.address ? '#161b28' : 'transparent',
              }}
            >
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 80px',
                padding: '12px 16px', alignItems: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { if (selected?.address !== c.address) e.currentTarget.parentElement.style.background = '#131824' }}
                onMouseLeave={e => { if (selected?.address !== c.address) e.currentTarget.parentElement.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'linear-gradient(135deg, #c9a84c22, #5b8fe822)',
                    border: '0.5px solid #c9a84c33',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, flexShrink: 0,
                  }}>📜</div>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c', fontWeight: 500 }}>
                    {short(c.address)}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591' }}>
                  {c.deployer !== '—' ? short(c.deployer) : '—'}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#8891a8' }}>
                  {c.block !== '—' ? `#${c.block}` : '—'}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: c.calls > 0 ? '#4caf82' : '#4a5266' }}>
                  {c.calls || 0}
                </span>
                <span style={{ fontSize: 11, color: '#4a5266' }}>{timeAgo(c.time)}</span>
              </div>

              {/* Expanded detail */}
              {selected?.address === c.address && (
                <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid #1a1f2e' }}>
                  <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Full Address</div>
                      <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#e0e2ea', wordBreak: 'break-all' }}>{c.address}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Code Hash</div>
                      <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#e0e2ea', wordBreak: 'break-all' }}>{c.codeHash}</div>
                    </div>
                    {c.deployer !== '—' && (
                      <div>
                        <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Deployer</div>
                        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#e0e2ea', wordBreak: 'break-all' }}>{c.deployer}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Status</div>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#4caf82', background: '#0d1f18', border: '0.5px solid #1d3d2a' }}>
                        Active
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.address) }}
                      style={{ padding: '6px 12px', background: '#1a1f2e', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#8891a8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    >
                      Copy Address
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.codeHash) }}
                      style={{ padding: '6px 12px', background: '#1a1f2e', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#8891a8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    >
                      Copy Code Hash
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live indicator */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 11, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
          Listening for new contract deployments in real time
        </span>
      </div>

    </div>
  )
}
