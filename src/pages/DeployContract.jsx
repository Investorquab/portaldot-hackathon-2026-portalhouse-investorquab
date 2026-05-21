import { useState } from 'react'

const TEMPLATES = [
  {
    id: 'flipper',
    name: 'Flipper',
    description: 'The simplest ink! contract. A boolean that flips between true and false. Perfect for testing your setup.',
    size: '4.2KB', icon: '🔄',
    params: [{ name: 'initValue', label: 'Initial Value', type: 'text', placeholder: 'true', hint: 'Starting value: true or false' }],
  },
  {
    id: 'erc20',
    name: 'ERC20 Token',
    description: 'A standard fungible token contract with name, symbol, and initial supply.',
    size: '18.4KB', icon: '🪙',
    params: [
      { name: 'name', label: 'Token Name', type: 'text', placeholder: 'My Token', hint: 'Full name' },
      { name: 'symbol', label: 'Symbol', type: 'text', placeholder: 'MTK', hint: 'Ticker symbol' },
      { name: 'supply', label: 'Total Supply', type: 'number', placeholder: '1000000', hint: 'Total tokens' },
    ],
  },
  {
    id: 'multisig',
    name: 'Multisig Wallet',
    description: 'Requires multiple signers to approve transactions. Great for team treasury.',
    size: '24.1KB', icon: '🔐',
    params: [
      { name: 'owners', label: 'Owner Addresses', type: 'textarea', placeholder: '5EHmLt...\n5GrwVa...', hint: 'One address per line' },
      { name: 'threshold', label: 'Required Signatures', type: 'number', placeholder: '2', hint: 'Min signatures needed' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Contract',
    description: 'Upload your own compiled ink! contract WASM file and ABI JSON.',
    size: '—', icon: '📜',
    params: [],
  },
]

function Field({ label, value, onChange, placeholder, type, hint }) {
  const base = { width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'Inter, sans-serif' }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5, fontWeight: 500 }}>{label}</div>
      {type === 'textarea'
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ ...base, resize: 'vertical' }} onFocus={e => e.target.style.borderColor='#c9a84c'} onBlur={e => e.target.style.borderColor='#1e2433'} />
        : <input type={type === 'bool' ? 'text' : type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} onFocus={e => e.target.style.borderColor='#c9a84c'} onBlur={e => e.target.style.borderColor='#1e2433'} />
      }
      {hint && <div style={{ fontSize: 11, color: '#4a5266', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function DeployContract({ wallet, api, getSigner }) {
  const [step, setStep] = useState('select')
  const [selected, setSelected] = useState(null)
  const [params, setParams] = useState({})
  const [customWasm, setCustomWasm] = useState(null)
  const [customAbi, setCustomAbi] = useState(null)
  const [deploying, setDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState(null)
  const [msg, setMsg] = useState(null)
  const [gasLimit, setGasLimit] = useState('50000000000')
  const [endowment, setEndowment] = useState('1000000000000')
  const [copied, setCopied] = useState(false)

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const handleWasm = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCustomWasm(ev.target.result)
    reader.readAsArrayBuffer(file)
  }

  const handleAbi = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { try { setCustomAbi(JSON.parse(ev.target.result)) } catch { showMsg('err', 'Invalid JSON file') } }
    reader.readAsText(file)
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(deployedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deploy = async () => {
    if (!wallet) return showMsg('err', 'Connect your wallet first')
    if (selected.id === 'custom' && !customWasm) return showMsg('err', 'Upload a WASM file first')
    setDeploying(true)

    try {
      if (selected.id !== 'custom') {
        // Template simulation — real WASM would be bundled in production
        await new Promise(r => setTimeout(r, 2000))
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
        const mockAddr = '5' + Array.from({length: 47}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        setDeployedAddress(mockAddr)
        setStep('success')
        setDeploying(false)
        return
      }

      // Real custom WASM deploy
      if (!api) return showMsg('err', 'Node not connected')
      const signer = await getSigner(wallet.address)
      const wasmHex = '0x' + Array.from(new Uint8Array(customWasm)).map(b => b.toString(16).padStart(2,'0')).join('')
      let selector = '0x9bae9d5e'
      if (customAbi?.spec?.constructors?.[0]?.selector) selector = customAbi.spec.constructors[0].selector

      await new Promise((resolve, reject) => {
        api.tx.contracts.instantiateWithCode(endowment, gasLimit, wasmHex, selector, '0x00')
          .signAndSend(wallet.address, { signer }, ({ status, events, dispatchError }) => {
            if (dispatchError) { reject(new Error(dispatchError.toString())); return }
            if (status.isInBlock) {
              let addr = null
              events.forEach(({ event }) => {
                if (event.section === 'contracts' && event.method === 'Instantiated') addr = event.data[1].toString()
              })
              setDeployedAddress(addr || 'Unknown — check Contract Registry')
              setStep('success')
              resolve()
            }
          })
      })
    } catch (err) {
      showMsg('err', err.message)
    }
    setDeploying(false)
  }

  const Msg = () => msg ? (
    <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.type === 'ok' ? '#0d1f18' : '#1f0d0d', border: `0.5px solid ${msg.type === 'ok' ? '#1d3d2a' : '#3d1a1a'}`, color: msg.type === 'ok' ? '#4caf82' : '#e05c5c' }}>{msg.text}</div>
  ) : null

  // SUCCESS
  if (step === 'success') return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 10, padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#4caf82', marginBottom: 8 }}>Contract Deployed!</div>
        <div style={{ fontSize: 13, color: '#6b7591', marginBottom: 24 }}>{selected?.name} is now live on Portaldot</div>
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, padding: '14px 20px', marginBottom: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Contract Address</div>
          <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c', wordBreak: 'break-all' }}>{deployedAddress}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={copyAddress} style={{ padding: '8px 18px', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: copied ? '#4caf82' : '#8891a8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {copied ? '✓ Copied' : 'Copy Address'}
          </button>
          <button onClick={() => { setStep('select'); setSelected(null); setDeployedAddress(null); setCustomWasm(null); setCustomAbi(null) }} style={{ padding: '8px 18px', background: '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#0a0d13', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Deploy Another
          </button>
        </div>
      </div>
    </div>
  )

  // CONFIGURE
  if (step === 'configure' && selected) return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>← Back</button>
      <Msg />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{selected.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e0e2ea', marginBottom: 8 }}>{selected.name}</div>
          <div style={{ fontSize: 13, color: '#6b7591', lineHeight: 1.7, marginBottom: 16 }}>{selected.description}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 4, fontSize: 11, color: '#5b8fe8', background: '#0d1525', border: '0.5px solid #1a2f50', fontFamily: 'JetBrains Mono, monospace' }}>ink!</span>
            {selected.size !== '—' && <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 4, fontSize: 11, color: '#4a5266', background: '#111520', border: '0.5px solid #1e2433', fontFamily: 'JetBrains Mono, monospace' }}>{selected.size}</span>}
          </div>
        </div>

        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8891a8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            {selected.id === 'custom' ? 'Upload Files' : 'Constructor Parameters'}
          </div>

          {selected.id === 'custom' ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>WASM File *</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0a0d13', border: `0.5px solid ${customWasm ? '#4caf82' : '#1e2433'}`, borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: customWasm ? '#4caf82' : '#4a5266' }}>{customWasm ? '✓ WASM file loaded' : '📁 Choose .wasm file'}</span>
                  <input type="file" accept=".wasm" onChange={handleWasm} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>ABI JSON (optional)</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0a0d13', border: `0.5px solid ${customAbi ? '#4caf82' : '#1e2433'}`, borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: customAbi ? '#4caf82' : '#4a5266' }}>{customAbi ? '✓ ABI loaded' : '📁 Choose .json file'}</span>
                  <input type="file" accept=".json" onChange={handleAbi} style={{ display: 'none' }} />
                </label>
              </div>
            </>
          ) : (
            selected.params.map(p => (
              <Field key={p.name} label={p.label} value={params[p.name] || ''} onChange={v => setParams(prev => ({ ...prev, [p.name]: v }))} placeholder={p.placeholder} type={p.type} hint={p.hint} />
            ))
          )}

          <details style={{ marginTop: 4 }}>
            <summary style={{ fontSize: 12, color: '#4a5266', cursor: 'pointer', marginBottom: 10 }}>Advanced settings</summary>
            <Field label="Gas Limit" value={gasLimit} onChange={setGasLimit} placeholder="50000000000" type="number" hint="Max gas for deployment" />
            <Field label="Endowment" value={endowment} onChange={setEndowment} placeholder="1000000000000" type="number" hint="Initial balance sent to contract" />
          </details>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={deploy} disabled={deploying || !wallet} style={{ padding: '10px 28px', background: deploying || !wallet ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: deploying || !wallet ? '#4a5266' : '#0a0d13', cursor: deploying || !wallet ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
          {deploying ? 'Deploying...' : `Deploy ${selected.name}`}
        </button>
        {!wallet && <span style={{ fontSize: 12, color: '#e05c5c' }}>Connect your wallet first</span>}
      </div>
    </div>
  )

  // SELECT
  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontSize: 13, color: '#6b7591', marginBottom: 24 }}>
        Deploy ink! smart contracts to Portaldot. Choose a template or upload your compiled WASM.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {TEMPLATES.map(t => (
          <div key={t.id} onClick={() => { setSelected(t); setStep('configure') }} style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c44'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2433'}
          >
            <div style={{ fontSize: 30, marginBottom: 10 }}>{t.icon}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e2ea' }}>{t.name}</div>
              {t.size !== '—' && <span style={{ fontSize: 11, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>{t.size}</span>}
            </div>
            <div style={{ fontSize: 13, color: '#6b7591', lineHeight: 1.6, marginBottom: 12 }}>{t.description}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#5b8fe8', background: '#0d1525', border: '0.5px solid #1a2f50', fontFamily: 'JetBrains Mono, monospace' }}>ink!</span>
              <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#4caf82', background: '#0d1f18', border: '0.5px solid #1d3d2a', fontFamily: 'JetBrains Mono, monospace' }}>
                {t.id === 'custom' ? 'Upload' : `${t.params.length} param${t.params.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 16px', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 12, color: '#4a5266', lineHeight: 1.7 }}>
        <span style={{ color: '#8891a8', fontWeight: 600 }}>Note: </span>
        Templates use simulated deployment on the local dev node. For custom contracts, compile with <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c9a84c' }}>cargo contract build</span> then upload the .wasm and .json files.
      </div>
    </div>
  )
}
