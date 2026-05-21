import { useState, useEffect } from 'react'

function Section({ title, children }) {
  return (
    <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5, fontWeight: 500 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px',
          background: '#0a0d13', border: '0.5px solid #1e2433',
          borderRadius: 8, fontSize: 13, color: '#e0e2ea',
          outline: 'none', fontFamily: type === 'number' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#c9a84c'}
        onBlur={e => e.target.style.borderColor = '#1e2433'}
      />
      {hint && <div style={{ fontSize: 11, color: '#4a5266', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function TokenCard({ token, onMint, onBurn, wallet }) {
  const [mintAmt, setMintAmt] = useState('')
  const [burnAmt, setBurnAmt] = useState('')
  const [toAddr, setToAddr] = useState('')
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ background: '#0e1117', border: '0.5px solid #1e2433', borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #c9a84c33, #5b8fe833)',
            border: '0.5px solid #c9a84c44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#c9a84c',
          }}>
            {token.symbol?.[0] || '?'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e2ea' }}>{token.name}</div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591' }}>{token.symbol} · ID #{token.id}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c', fontFamily: 'JetBrains Mono, monospace' }}>{token.supply || '—'}</div>
            <div style={{ fontSize: 11, color: '#4a5266' }}>supply</div>
          </div>
          <span style={{ color: '#4a5266', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid #1e2433' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8891a8', marginBottom: 8, fontWeight: 600 }}>MINT</div>
              <input value={toAddr} onChange={e => setToAddr(e.target.value)} placeholder="Recipient address" style={{ width: '100%', padding: '7px 10px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#e0e2ea', outline: 'none', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={mintAmt} onChange={e => setMintAmt(e.target.value)} placeholder="Amount" type="number" style={{ flex: 1, padding: '7px 10px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                <button onClick={() => onMint(token.id, toAddr, mintAmt)} style={{ padding: '7px 12px', background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 6, fontSize: 12, color: '#4caf82', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Mint</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8891a8', marginBottom: 8, fontWeight: 600 }}>BURN</div>
              <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 6 }}>Burns from your wallet</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>
                <input value={burnAmt} onChange={e => setBurnAmt(e.target.value)} placeholder="Amount" type="number" style={{ flex: 1, padding: '7px 10px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                <button onClick={() => onBurn(token.id, burnAmt)} style={{ padding: '7px 12px', background: '#1f0d0d', border: '0.5px solid #3d1a1a', borderRadius: 6, fontSize: 12, color: '#e05c5c', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Burn</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TokenStudio({ wallet, api, getSigner: getSignerProp }) {
  const [tab, setTab] = useState('create')
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(false)
  const [transferAssetId, setTransferAssetId] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmt, setTransferAmt] = useState('')
  const [msg, setMsg] = useState(null)

  // Create form
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('12')
  const [supply, setSupply] = useState('')
  const [minBalance, setMinBalance] = useState('1')

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const getSigner = getSignerProp || (async () => { throw new Error('No signer available') })

  const loadTokens = async () => {
    if (!api) return
    try {
      const entries = await api.query.assets.asset.entries()
      const loaded = await Promise.all(entries.map(async ([key, val]) => {
        const id = key.args[0].toNumber()
        let name = `Asset #${id}`, symbol = `A${id}`, decimals = 12, supply = '—', owner = '—'
        try {
          const meta = await api.query.assets.metadata(id)
          // Decode hex-encoded name/symbol from chain
          const decodeHex = (val) => {
            try {
              const h = val?.toString?.() || ''
              if (h.startsWith('0x')) return Buffer.from(h.slice(2), 'hex').toString('utf8').replace(/\0/g,'').trim()
              return val?.toHuman?.()?.toString?.() || h
            } catch { return '' }
          }
          const rawName = decodeHex(meta.name)
          const rawSymbol = decodeHex(meta.symbol)
          if (rawName) name = rawName
          if (rawSymbol) symbol = rawSymbol
          decimals = meta.decimals?.toNumber?.() || 12
        } catch {}
        try {
          const asset = val.isSome ? val.unwrap() : val.unwrapOrDefault()
          supply = asset.supply?.toHuman?.() || asset.supply?.toString?.() || '—'
          owner = asset.owner?.toString?.() || '—'
        } catch {}
        return { id, name, symbol, decimals, supply, owner }
      }))
      setTokens(loaded.filter(t => t.id !== undefined).sort((a, b) => b.id - a.id))
    } catch (err) {
      console.error('Load tokens error:', err)
    }
  }

  useEffect(() => { loadTokens() }, [api])

  const transferToken = async () => {
    if (!wallet || !api) return showMsg('err', 'Connect your wallet first')
    if (!transferAssetId || !transferTo || !transferAmt) return showMsg('err', 'Fill all fields')
    setLoading(true)
    try {
      const signer = await getSigner(wallet.address)
      await api.tx.assets.transfer(
        parseInt(transferAssetId),
        { Id: transferTo },
        transferAmt
      ).signAndSend(wallet.address, { signer }, ({ status }) => {
        if (status.isInBlock) {
          showMsg('ok', `Sent ${transferAmt} tokens to ${transferTo.slice(0,10)}...`)
          setTransferAmt('')
          setLoading(false)
        }
      })
    } catch (err) {
      showMsg('err', err.message)
      setLoading(false)
    }
  }

  const createToken = async () => {
    if (!wallet || !api) return showMsg('err', 'Connect your wallet first')
    if (!name || !symbol || !supply) return showMsg('err', 'Fill in all required fields')
    setLoading(true)
    try {
      const signer = await getSigner(wallet.address)
      // Get next asset ID
      const nextId = (await api.query.assets.nextAssetId?.()) || Math.floor(Math.random() * 9000) + 1000
      const id = typeof nextId === 'object' ? nextId.toNumber() : nextId

      // Batch: create + setMetadata + mint
      const txs = [
        api.tx.assets.create(id, wallet.address, minBalance),
        api.tx.assets.setMetadata(id, name, symbol, parseInt(decimals)),
        api.tx.assets.mint(id, wallet.address, supply),
      ]

      await api.tx.utility.batchAll(txs).signAndSend(
        wallet.address,
        { signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            showMsg('ok', `✅ Token "${symbol}" created! ID: ${id}`)
            setName(''); setSymbol(''); setSupply('')
            setLoading(false)
            setTimeout(loadTokens, 3000)
          }
        }
      )
    } catch (err) {
      showMsg('err', err.message)
      setLoading(false)
    }
  }

  const mintToken = async (id, to, amount) => {
    if (!wallet || !api || !to || !amount) return
    try {
      const signer = await getSigner(wallet.address)
      await api.tx.assets.mint(id, to, amount).signAndSend(
        wallet.address, { signer },
        ({ status }) => { if (status.isInBlock) { showMsg('ok', `Minted ${amount} tokens`); loadTokens() } }
      )
    } catch (err) { showMsg('err', err.message) }
  }

  const burnToken = async (id, amount) => {
    if (!wallet || !api || !amount) return
    try {
      const signer = await getSigner(wallet.address)
      await api.tx.assets.burn(id, wallet.address, amount).signAndSend(
        wallet.address, { signer },
        ({ status }) => { if (status.isInBlock) { showMsg('ok', `Burned ${amount} tokens`); loadTokens() } }
      )
    } catch (err) { showMsg('err', err.message) }
  }

  const tabStyle = (t) => ({
    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif',
    background: tab === t ? '#c9a84c' : '#111520',
    color: tab === t ? '#0a0d13' : '#6b7591',
    transition: 'all 0.15s',
  })

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>

      {!wallet && (
        <div style={{ padding: '40px', textAlign: 'center', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🪙</div>
          <div style={{ fontSize: 15, color: '#8891a8' }}>Connect your wallet to create and manage tokens</div>
        </div>
      )}

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: msg.type === 'ok' ? '#0d1f18' : '#1f0d0d',
          border: `0.5px solid ${msg.type === 'ok' ? '#1d3d2a' : '#3d1a1a'}`,
          color: msg.type === 'ok' ? '#4caf82' : '#e05c5c',
        }}>{msg.text}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button style={tabStyle('create')} onClick={() => setTab('create')}>Create Token</button>
        <button style={tabStyle('manage')} onClick={() => { setTab('manage'); loadTokens() }}>
          Manage Tokens {tokens.length > 0 && `(${tokens.length})`}
        </button>
        <button style={tabStyle('transfer')} onClick={() => setTab('transfer')}>Send Tokens</button>
      </div>

      {tab === 'create' && (
        <Section title="Create New Token">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Field label="Token Name *" value={name} onChange={setName} placeholder="My Token" hint="Full name of your token" />
              <Field label="Symbol *" value={symbol} onChange={v => setSymbol(v.toUpperCase())} placeholder="MTK" hint="3-5 characters, uppercase" />
              <Field label="Decimals" value={decimals} onChange={setDecimals} placeholder="12" type="number" hint="12 = same as POT" />
            </div>
            <div>
              <Field label="Initial Supply *" value={supply} onChange={setSupply} placeholder="1000000" type="number" hint="Total tokens to mint on creation" />
              <Field label="Min Balance" value={minBalance} onChange={setMinBalance} placeholder="1" type="number" hint="Minimum balance per account" />

              {/* Preview */}
              {(name || symbol) && (
                <div style={{ background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, padding: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 8 }}>PREVIEW</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #c9a84c33, #5b8fe833)', border: '0.5px solid #c9a84c44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#c9a84c' }}>
                      {symbol?.[0] || name?.[0] || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e2ea' }}>{name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#6b7591', fontFamily: 'JetBrains Mono, monospace' }}>{symbol || '—'} · {supply ? parseInt(supply).toLocaleString() : '0'} supply</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, paddingTop: 16, borderTop: '0.5px solid #1e2433' }}>
            <button
              onClick={createToken}
              disabled={loading || !wallet || !name || !symbol || !supply}
              style={{
                padding: '10px 24px', background: loading || !wallet ? '#1a1f2e' : '#c9a84c',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                color: loading || !wallet ? '#4a5266' : '#0a0d13',
                cursor: loading || !wallet ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              }}
            >
              {loading ? 'Creating...' : '🪙 Create Token'}
            </button>
            <div style={{ fontSize: 12, color: '#4a5266', marginTop: 8 }}>
              This will sign 3 transactions: create → set metadata → mint initial supply
            </div>
          </div>
        </Section>
      )}

      {tab === 'transfer' && (
        <Section title="Send Tokens">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Select Token *</div>
            {tokens.length === 0 ? (
              <div style={{ fontSize: 13, color: '#4a5266', padding: '10px 0' }}>No tokens found — create one first or click Manage Tokens → Refresh</div>
            ) : (
              <select value={transferAssetId} onChange={e => setTransferAssetId(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none' }}>
                <option value="">Choose a token...</option>
                {tokens.map(t => <option key={t.id} value={t.id}>{t.symbol} — {t.name} (ID: {t.id})</option>)}
              </select>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Recipient Address *</div>
            <input value={transferTo} onChange={e => setTransferTo(e.target.value)} placeholder="5EHmLt..." style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Amount *</div>
            <input value={transferAmt} onChange={e => setTransferAmt(e.target.value)} placeholder="1000" type="number" style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
          <button onClick={transferToken} disabled={loading || !transferAssetId || !transferTo || !transferAmt} style={{ padding: '10px 24px', background: loading ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: loading ? '#4a5266' : '#0a0d13', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {loading ? 'Sending...' : 'Send Tokens'}
          </button>
        </Section>
      )}

      {tab === 'manage' && (
        <Section title={`Your Tokens (${tokens.length})`}>
          {tokens.length === 0 ? (
            <div style={{ fontSize: 13, color: '#4a5266', textAlign: 'center', padding: '20px 0' }}>
              No tokens found on chain. Create one first.
            </div>
          ) : (
            tokens.map(token => (
              <TokenCard
                key={token.id}
                token={token}
                wallet={wallet}
                onMint={mintToken}
                onBurn={burnToken}
              />
            ))
          )}
          <button onClick={loadTokens} style={{ marginTop: 8, padding: '6px 14px', background: '#1a1f2e', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#8891a8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            ↻ Refresh
          </button>
        </Section>
      )}
    </div>
  )
}
