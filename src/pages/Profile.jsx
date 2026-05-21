import { useState, useEffect } from 'react'

function Section({ title, children }) {
  return (
    <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid #1a1f2e' }}>
      <span style={{ fontSize: 13, color: '#6b7591' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif', color: color || '#e0e2ea', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}

export function Profile({ wallet, api, getBalance, getIdentity }) {
  const [balance, setBalance] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [staking, setStaking] = useState(null)
  const [loading, setLoading] = useState(true)

  // Identity form
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [twitter, setTwitter] = useState('')
  const [web, setWeb] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!wallet?.address) return
    loadData()
  }, [wallet?.address])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bal, id] = await Promise.all([
        getBalance(wallet.address),
        getIdentity(wallet.address),
      ])
      setBalance(bal)
      setIdentity(id)
      if (id) {
        setDisplayName(id.display || '')
        setEmail(id.email || '')
        setTwitter(id.twitter || '')
        setWeb(id.web || '')
      }

      // Try to get staking info
      if (api) {
        try {
          const ledger = await api.query.staking?.ledger(wallet.address)
          if (ledger?.isSome) {
            const l = ledger.unwrap()
            setStaking({
              active: l.active.toHuman(),
              total: l.total.toHuman(),
            })
          }
        } catch {}
      }
    } catch (err) {
      console.error('Profile load error:', err)
    }
    setLoading(false)
  }

  const saveIdentity = async () => {
    if (!api || !wallet?.address) return
    setSaving(true)
    setMsg(null)
    try {
      // Try all injected extensions to find a signer for this address
      let signer = null
      const injected = window.injectedWeb3 || {}
      for (const key of Object.keys(injected)) {
        try {
          const ext = await injected[key].enable('PortalHouse')
          const accs = await ext.accounts.get()
          const match = accs.find(a => a.address === wallet.address)
          if (match) { signer = ext.signer; break }
        } catch {}
      }

      // Fallback to web3FromAddress
      if (!signer) {
        const { web3FromAddress } = await import('@polkadot/extension-dapp')
        const injector = await web3FromAddress(wallet.address)
        signer = injector.signer
      }

      if (!signer) throw new Error('Could not find signer for this address')

      await api.tx.identity.setIdentity({
        display: { Raw: displayName },
        email: email ? { Raw: email } : { None: null },
        twitter: twitter ? { Raw: twitter } : { None: null },
        web: web ? { Raw: web } : { None: null },
        legal: { None: null },
        riot: { None: null },
        image: { None: null },
        pgpFingerprint: null,
        additional: [],
      }).signAndSend(wallet.address, { signer }, ({ status }) => {
        if (status.isInBlock) {
          setMsg({ type: 'ok', text: 'Identity saved on-chain!' })
          setEditMode(false)
          setSaving(false)
          setTimeout(loadData, 3000)
        }
      })
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
      setSaving(false)
    }
  }

  if (!wallet) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
        <div style={{ fontSize: 15, color: '#8891a8', marginBottom: 8 }}>No wallet connected</div>
        <div style={{ fontSize: 13, color: '#4a5266' }}>Connect your wallet from the sidebar to view your profile.</div>
      </div>
    )
  }

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #c9a84c, #5b8fe8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#0a0d13', flexShrink: 0,
        }}>
          {(identity?.display || wallet.name || 'A')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#e0e2ea' }}>
            {identity?.display || wallet.name || 'Unknown'}
          </div>
          {identity?.twitter && (
            <div style={{ fontSize: 12, color: '#5b8fe8', marginTop: 2 }}>
              <a href={`https://x.com/${identity.twitter.replace('@','')}`} target="_blank" style={{ color: '#5b8fe8', textDecoration: 'none' }}>
                {identity.twitter}
              </a>
            </div>
          )}
          <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591', marginTop: 3 }}>
            {wallet.address}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {identity
            ? <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 4, fontSize: 12, color: '#4caf82', background: '#0d1f18', border: '0.5px solid #1d3d2a' }}>✓ Identity Set</span>
            : <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 4, fontSize: 12, color: '#c9a84c', background: '#1a1508', border: '0.5px solid #3d3010' }}>No Identity</span>
          }
        </div>
      </div>

      {/* Balance */}
      <Section title="Balance">
        <Row label="Free Balance" value={balance?.free || wallet.balance || '0 POT'} mono color="#c9a84c" />
        <Row label="Reserved" value={balance?.reserved || '0 POT'} mono />
        <div style={{ paddingTop: 8, borderTop: 'none' }}>
          <button onClick={loadData} style={{
            marginTop: 8, padding: '6px 14px', background: '#1a1f2e',
            border: '0.5px solid #1e2433', borderRadius: 6,
            fontSize: 12, color: '#8891a8', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>↻ Refresh</button>
        </div>
      </Section>

      {/* Staking */}
      <Section title="Staking">
        {staking ? (
          <>
            <Row label="Active Stake" value={staking.active} mono color="#5b8fe8" />
            <Row label="Total Stake" value={staking.total} mono />
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#4a5266' }}>No active staking position found.</div>
        )}
      </Section>

      {/* Identity */}
      <Section title="On-Chain Identity">
        {msg && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13,
            background: msg.type === 'ok' ? '#0d1f18' : '#1f0d0d',
            border: `0.5px solid ${msg.type === 'ok' ? '#1d3d2a' : '#3d1a1a'}`,
            color: msg.type === 'ok' ? '#4caf82' : '#e05c5c',
          }}>{msg.text}</div>
        )}

        {!editMode ? (
          <>
            <Row label="Display Name" value={identity?.display} />
            <Row label="Email" value={identity?.email} />
            <Row label="Twitter" value={identity?.twitter} />
            <Row label="Website" value={identity?.web} />
            <button onClick={() => { setEditMode(true); setMsg(null) }} style={{
              marginTop: 12, padding: '7px 16px',
              background: '#1a1f2e', border: '0.5px solid #2a3050',
              borderRadius: 6, fontSize: 13, color: '#c9a84c',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            }}>
              {identity ? 'Edit Identity' : 'Set Identity'}
            </button>
          </>
        ) : (
          <>
            {[
              { label: 'Display Name', val: displayName, set: setDisplayName, ph: 'Your name' },
              { label: 'Email', val: email, set: setEmail, ph: 'email@example.com' },
              { label: 'Twitter', val: twitter, set: setTwitter, ph: '@handle' },
              { label: 'Website', val: web, set: setWeb, ph: 'https://yoursite.com' },
            ].map(({ label, val, set, ph }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#6b7591', marginBottom: 4 }}>{label}</div>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={ph}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: '#0a0d13', border: '0.5px solid #1e2433',
                    borderRadius: 8, fontSize: 13, color: '#e0e2ea',
                    outline: 'none', fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={saveIdentity} disabled={saving} style={{
                padding: '7px 16px', background: '#c9a84c',
                border: 'none', borderRadius: 6, fontSize: 13,
                color: '#0a0d13', cursor: 'pointer', fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
              }}>
                {saving ? 'Saving...' : 'Save On-Chain'}
              </button>
              <button onClick={() => setEditMode(false)} style={{
                padding: '7px 16px', background: 'transparent',
                border: '0.5px solid #1e2433', borderRadius: 6,
                fontSize: 13, color: '#6b7591', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}>Cancel</button>
            </div>
          </>
        )}
      </Section>

      {/* NFTs placeholder */}
      <Section title="NFTs & Assets">
        <div style={{ fontSize: 13, color: '#4a5266' }}>
          NFT and custom asset display coming in the next update.
        </div>
      </Section>

    </div>
  )
}
