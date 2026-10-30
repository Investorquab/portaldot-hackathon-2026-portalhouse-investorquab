import { useState } from 'react'
import { DEMO_CONTRACT } from '../evm/demoContract'
import {
  PORTALDOT_EVM, ensurePortaldotChain, deployBytecode,
  waitForContractAddress, encodeUint256, explorerTx, explorerAddress, shortAddr,
} from '../evm/portaldotEvm'

const GOLD = '#c9a84c'
const BLUE = '#5b8fe8'
const GREEN = '#4caf82'
const RED = '#e05c5c'

/* ─────────────────────────── shared bits ─────────────────────────── */

function Field({ label, value, onChange, placeholder, type, hint, mono }) {
  const base = { width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5, fontWeight: 500 }}>{label}</div>
      {type === 'textarea'
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ ...base, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = GOLD} onBlur={e => e.target.style.borderColor = '#1e2433'} />
        : <input type={type === 'bool' ? 'text' : type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} onFocus={e => e.target.style.borderColor = GOLD} onBlur={e => e.target.style.borderColor = '#1e2433'} />
      }
      {hint && <div style={{ fontSize: 11, color: '#4a5266', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Pill({ color, children }) {
  return <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 5, fontSize: 11, color, background: color + '18', border: `0.5px solid ${color}33`, fontFamily: 'JetBrains Mono, monospace' }}>{children}</span>
}

/* ─────────────────────────── EVM one-click deploy ─────────────────────────── */

function EvmDeploy({ evmWallet, onConnectEvm }) {
  const [initialCount, setInitialCount] = useState('42')
  const [phase, setPhase] = useState('idle') // idle | signing | mining | done
  const [txHash, setTxHash] = useState(null)
  const [address, setAddress] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const busy = phase === 'signing' || phase === 'mining'
  const wrongChain = evmWallet && evmWallet.chainId !== PORTALDOT_EVM.chainId

  const deploy = async () => {
    setError(null)
    if (!evmWallet) { onConnectEvm(); return }
    let args
    try { args = encodeUint256(initialCount) } catch (e) { setError(e.message); return }
    try {
      setPhase('signing')
      await ensurePortaldotChain(evmWallet.provider)
      const hash = await deployBytecode(evmWallet.provider, evmWallet.address, DEMO_CONTRACT.bytecode, args)
      setTxHash(hash)
      setPhase('mining')
      const addr = await waitForContractAddress(evmWallet.provider, hash)
      setAddress(addr)
      setPhase('done')
    } catch (e) {
      const m = e?.code === 4001 ? 'You rejected the transaction in your wallet.' : (e?.message || String(e))
      setError(m)
      setPhase('idle')
    }
  }

  const reset = () => { setPhase('idle'); setTxHash(null); setAddress(null); setError(null) }
  const copy = () => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1800) }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
      {/* Left — the contract source, the thing being deployed */}
      <div style={{ background: '#0b0f17', border: `0.5px solid ${BLUE}22`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #1e2433', background: '#0e1320' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: BLUE, display: 'inline-block' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e2ea', fontFamily: 'JetBrains Mono, monospace' }}>{DEMO_CONTRACT.name}.sol</span>
          </div>
          <Pill color={BLUE}>{DEMO_CONTRACT.compiler}</Pill>
        </div>
        <pre style={{ margin: 0, padding: 16, fontSize: 12, lineHeight: 1.65, color: '#9aa4bd', fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', maxHeight: 360 }}>{DEMO_CONTRACT.source}</pre>
      </div>

      {/* Right — configure + deploy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e2ea', marginBottom: 4 }}>One number to set</div>
          <div style={{ fontSize: 12, color: '#6b7591', marginBottom: 14, lineHeight: 1.5 }}>
            The constructor stores this starting count on-chain. Change it, then deploy — nothing else to edit.
          </div>
          <Field label="initialCount (uint256)" value={initialCount} onChange={setInitialCount} placeholder="42" type="number" mono hint="Any whole number ≥ 0" />

          {phase === 'done' ? (
            <div style={{ background: '#0d1f18', border: `0.5px solid ${GREEN}44`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 10 }}>✅ Contract deployed</div>
              <div style={{ fontSize: 10, color: '#4a5266', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Address</div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: BLUE, wordBreak: 'break-all', marginBottom: 12 }}>{address}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={copy} style={btn('#111520', copied ? GREEN : '#8891a8', '#1e2433')}>{copied ? '✓ Copied' : 'Copy address'}</button>
                <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" style={{ ...btn('#111520', BLUE, '#1e2433'), textDecoration: 'none' }}>View tx ↗</a>
                <a href={explorerAddress(address)} target="_blank" rel="noreferrer" style={{ ...btn('#111520', BLUE, '#1e2433'), textDecoration: 'none' }}>Explorer ↗</a>
              </div>
              <button onClick={reset} style={{ ...btn('transparent', '#6b7591', 'transparent'), marginTop: 10, paddingLeft: 0 }}>Deploy another →</button>
            </div>
          ) : (
            <>
              <button
                onClick={deploy}
                disabled={busy}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: busy ? '#1a2640' : BLUE, color: busy ? '#6b7591' : '#07101f',
                  fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                }}
              >
                {phase === 'signing' ? 'Confirm in your wallet…' : phase === 'mining' ? 'Deploying — mining block…' : evmWallet ? 'Deploy & Sign' : 'Connect EVM wallet to deploy'}
              </button>
              {busy && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#6b7591', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spin" style={{ width: 12, height: 12, border: `2px solid ${BLUE}55`, borderTopColor: BLUE, borderRadius: '50%', display: 'inline-block' }} />
                  {phase === 'signing' ? 'Waiting for your signature' : txHash ? `tx ${shortAddr(txHash)} submitted` : 'Submitting'}
                </div>
              )}
              {error && <div style={{ marginTop: 10, fontSize: 12, color: RED, lineHeight: 1.5 }}>{error}</div>}
            </>
          )}
        </div>

        {/* Wallet status */}
        <div style={{ background: '#0e1320', border: `0.5px solid ${BLUE}22`, borderRadius: 12, padding: 14 }}>
          {evmWallet ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                <span style={{ fontSize: 11, color: '#8891a8' }}>{evmWallet.name} connected</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: BLUE }}>{shortAddr(evmWallet.address)}</div>
              {wrongChain
                ? <div style={{ fontSize: 11, color: GOLD, marginTop: 6 }}>On chain {evmWallet.chainId} — deploy will switch you to Portaldot V3.</div>
                : <div style={{ fontSize: 11, color: '#4a5266', marginTop: 6 }}>Portaldot V3 · chain {PORTALDOT_EVM.chainId}</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 10 }}>No EVM wallet connected. Use MetaMask, Rabby, or any injected wallet.</div>
              <button onClick={onConnectEvm} style={{ ...btn('transparent', BLUE, BLUE + '55'), width: '100%' }}>Connect EVM wallet</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Substrate ink! / WASM ─────────────────────────── */

const TEMPLATES = [
  { id: 'flipper', name: 'Flipper', description: 'The simplest ink! contract — a boolean that flips. Good for a first look.', size: '4.2KB', icon: '🔄' },
  { id: 'erc20', name: 'ERC20 Token', description: 'A standard fungible token contract with name, symbol, and supply.', size: '18.4KB', icon: '🪙' },
  { id: 'custom', name: 'Custom WASM', description: 'Upload your own compiled ink! .wasm (+ optional ABI) for a real on-chain deploy.', size: '—', icon: '📜' },
]

function btn(bg, color, border) {
  return { padding: '8px 14px', background: bg, border: `0.5px solid ${border}`, borderRadius: 8, fontSize: 12, color, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }
}

function SubstrateDeploy({ wallet, api, getSigner }) {
  const [selected, setSelected] = useState(null)
  const [customWasm, setCustomWasm] = useState(null)
  const [customAbi, setCustomAbi] = useState(null)
  const [deploying, setDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState(null)
  const [msg, setMsg] = useState(null)
  const [gasLimit, setGasLimit] = useState('10000000000')
  const [endowment, setEndowment] = useState('0')

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const handleWasm = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setCustomWasm(ev.target.result); r.readAsArrayBuffer(f) }
  const handleAbi = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { setCustomAbi(JSON.parse(ev.target.result)) } catch { showMsg('err', 'Invalid JSON file') } }; r.readAsText(f) }

  const deploy = async () => {
    if (!wallet) return showMsg('err', 'Connect your Substrate wallet first')
    if (selected?.id !== 'custom') {
      // Templates are a simulated walkthrough — no bundled WASM artifact.
      setDeploying(true)
      await new Promise(r => setTimeout(r, 1600))
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
      setDeployedAddress('5' + Array.from({ length: 47 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
      setDeploying(false)
      return
    }
    if (!customWasm) return showMsg('err', 'Upload a .wasm file first')
    if (!api) return showMsg('err', 'Node not connected')
    setDeploying(true)
    try {
      const signer = await getSigner(wallet.address)
      const wasmHex = '0x' + Array.from(new Uint8Array(customWasm)).map(b => b.toString(16).padStart(2, '0')).join('')
      let selector = '0x9bae9d5e'
      if (customAbi?.spec?.constructors?.[0]?.selector) selector = customAbi.spec.constructors[0].selector
      const gas = api.registry.createType('WeightV2', { refTime: BigInt(gasLimit || '10000000000'), proofSize: 5_000_000 })
      const salt = '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
      await new Promise((resolve, reject) => {
        api.tx.contracts.instantiateWithCode(endowment, gas, null, wasmHex, selector, salt)
          .signAndSend(wallet.address, { signer }, ({ status, events, dispatchError }) => {
            if (dispatchError) { reject(new Error(dispatchError.toString())); return }
            if (status.isInBlock) {
              let addr = null
              events.forEach(({ event }) => { if (event.section === 'contracts' && event.method === 'Instantiated') addr = event.data[1].toString() })
              setDeployedAddress(addr || 'Deployed — see Contract Registry')
              resolve()
            }
          })
      })
    } catch (err) { showMsg('err', err.message) }
    setDeploying(false)
  }

  if (deployedAddress) return (
    <div style={{ background: '#0d1f18', border: `0.5px solid ${GREEN}44`, borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: GREEN, marginBottom: 6 }}>Contract deployed</div>
      <div style={{ fontSize: 12, color: '#6b7591', marginBottom: 18 }}>{selected?.name} on Portaldot V3 {selected?.id !== 'custom' && '(simulated)'}</div>
      <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, padding: 14, marginBottom: 16, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: '#4a5266', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Contract address</div>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: GOLD, wordBreak: 'break-all' }}>{deployedAddress}</div>
      </div>
      <button onClick={() => { setDeployedAddress(null); setSelected(null); setCustomWasm(null); setCustomAbi(null) }} style={btn(GOLD, '#0a0d13', GOLD)}>Deploy another</button>
    </div>
  )

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Back</button>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: msg.type === 'ok' ? '#0d1f18' : '#1f0d0d', border: `0.5px solid ${msg.type === 'ok' ? '#1d3d2a' : '#3d1a1a'}`, color: msg.type === 'ok' ? GREEN : RED }}>{msg.text}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>{selected.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e0e2ea', marginBottom: 8 }}>{selected.name}</div>
          <div style={{ fontSize: 13, color: '#6b7591', lineHeight: 1.7, marginBottom: 14 }}>{selected.description}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill color={BLUE}>ink!</Pill>
            {selected.id !== 'custom' ? <Pill color={GOLD}>simulated</Pill> : <Pill color={GREEN}>real deploy</Pill>}
          </div>
        </div>
        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 12, padding: 22 }}>
          {selected.id === 'custom' ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>WASM file *</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0a0d13', border: `0.5px solid ${customWasm ? GREEN : '#1e2433'}`, borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: customWasm ? GREEN : '#4a5266' }}>{customWasm ? '✓ WASM loaded' : '📁 Choose .wasm'}</span>
                  <input type="file" accept=".wasm" onChange={handleWasm} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>ABI JSON (optional)</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#0a0d13', border: `0.5px solid ${customAbi ? GREEN : '#1e2433'}`, borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: customAbi ? GREEN : '#4a5266' }}>{customAbi ? '✓ ABI loaded' : '📁 Choose .json'}</span>
                  <input type="file" accept=".json" onChange={handleAbi} style={{ display: 'none' }} />
                </label>
              </div>
              <Field label="Gas limit (refTime)" value={gasLimit} onChange={setGasLimit} type="number" mono />
              <Field label="Endowment" value={endowment} onChange={setEndowment} type="number" mono hint="Value sent to the contract (planck)" />
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#6b7591', lineHeight: 1.7 }}>
              This template runs as a guided walkthrough — PortalHouse doesn't bundle its compiled WASM.
              For a real on-chain ink! deploy, use <span style={{ color: GOLD }}>Custom WASM</span>, or switch to the
              <span style={{ color: BLUE }}> EVM</span> tab for a one-click Solidity deploy.
            </div>
          )}
          <button onClick={deploy} disabled={deploying || !wallet} style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 10, border: 'none', background: deploying || !wallet ? '#1a1f2e' : GOLD, color: deploying || !wallet ? '#4a5266' : '#0a0d13', fontSize: 14, fontWeight: 700, cursor: deploying || !wallet ? 'not-allowed' : 'pointer' }}>
            {deploying ? 'Deploying…' : `Deploy ${selected.name}`}
          </button>
          {!wallet && <div style={{ fontSize: 11, color: RED, marginTop: 8 }}>Connect your Substrate wallet first</div>}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {TEMPLATES.map(t => (
        <div key={t.id} onClick={() => setSelected(t)} style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = GOLD + '55'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2433'}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>{t.icon}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e0e2ea', marginBottom: 6 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: '#6b7591', lineHeight: 1.6, marginBottom: 12 }}>{t.description}</div>
          {t.id === 'custom' ? <Pill color={GREEN}>real deploy</Pill> : <Pill color={GOLD}>walkthrough</Pill>}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── page shell + mode toggle ─────────────────────────── */

export function DeployContract({ wallet, api, getSigner, evmWallet, onConnectEvm }) {
  const [mode, setMode] = useState('evm')

  const Tab = ({ id, accent, title, sub }) => {
    const on = mode === id
    return (
      <button onClick={() => setMode(id)} style={{
        flex: 1, textAlign: 'left', padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
        background: on ? accent + '14' : '#0e1117',
        border: `0.5px solid ${on ? accent + '66' : '#1e2433'}`,
        transition: 'all 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: accent, display: 'inline-block' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: on ? '#e8eaf0' : '#8891a8' }}>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: on ? '#8891a8' : '#4a5266' }}>{sub}</div>
      </button>
    )
  }

  return (
    <div className="fadein" style={{ padding: '28px 36px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ fontSize: 13, color: '#6b7591', marginBottom: 16, lineHeight: 1.6 }}>
        Deploy a contract to the Portaldot V3 testnet — a one-click Solidity contract over EVM, or an ink! / WASM contract over the native Substrate pallet.
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Tab id="evm" accent={BLUE} title="EVM · Solidity" sub="One click, change one number, sign in MetaMask" />
        <Tab id="substrate" accent={GOLD} title="Substrate · ink! / WASM" sub="Templates or your own compiled .wasm" />
      </div>

      {mode === 'evm'
        ? <EvmDeploy evmWallet={evmWallet} onConnectEvm={onConnectEvm} />
        : <SubstrateDeploy wallet={wallet} api={api} getSigner={getSigner} />}
    </div>
  )
}
