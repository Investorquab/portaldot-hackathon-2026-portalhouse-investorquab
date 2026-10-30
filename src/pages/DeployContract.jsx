import { useState, useEffect } from 'react'
import { CodePromise, Abi } from '@polkadot/api-contract'
import { DEMO_CONTRACT } from '../evm/demoContract'
import {
  PORTALDOT_EVM, ensurePortaldotChain, deployBytecode,
  waitForContractAddress, encodeUint256, explorerTx, explorerAddress, shortAddr,
  estimateDeploy, getBalanceWei, formatTpot,
} from '../evm/portaldotEvm'
import inkBundle from '../contracts/incrementer.contract.json'

const GOLD = '#c9a84c'
const BLUE = '#5b8fe8'
const GREEN = '#4caf82'
const RED = '#e05c5c'
const SUB_EXPLORER = 'https://scanner-testnet-v3.portaldot.dev'

const INK_SOURCE = `#[ink::contract]
mod incrementer {
    #[ink(storage)]
    pub struct Incrementer { value: i32 }

    impl Incrementer {
        #[ink(constructor)]
        pub fn new(init_value: i32) -> Self {
            Self { value: init_value }
        }
        #[ink(message)]
        pub fn inc(&mut self, by: i32) {
            self.value = self.value.saturating_add(by);
        }
        #[ink(message)]
        pub fn get(&self) -> i32 { self.value }
    }
}`

/* ─────────────────────────── shared bits ─────────────────────────── */

function Field({ label, value, onChange, placeholder, type, hint, mono, accent = GOLD }) {
  const base = { width: '100%', padding: '9px 12px', background: 'var(--bg0)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, fontWeight: 500 }}>{label}</div>
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
      {hint && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Pill({ color, children }) {
  return <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 5, fontSize: 11, color, background: color + '18', border: `0.5px solid ${color}33`, fontFamily: 'JetBrains Mono, monospace' }}>{children}</span>
}

function btn(bg, color, border) {
  return { padding: '8px 14px', background: bg, border: `0.5px solid ${border}`, borderRadius: 8, fontSize: 12, color, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }
}

/* ─────────────────────────── EVM: compile + deploy ─────────────────────────── */

function EvmDeploy({ evmWallet, onConnectEvm }) {
  const [initialCount, setInitialCount] = useState('42')
  const [phase, setPhase] = useState('idle')
  const [txHash, setTxHash] = useState(null)
  const [address, setAddress] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const [est, setEst] = useState(null) // { cost, balance, enough }

  const busy = phase === 'signing' || phase === 'mining'
  const wrongChain = evmWallet && evmWallet.chainId !== PORTALDOT_EVM.chainId

  // Preview the gas cost + wallet balance so an underfunded wallet is obvious
  // before signing (this chain charges real tPOT for EVM gas).
  useEffect(() => {
    let cancelled = false
    if (!evmWallet || wrongChain || phase === 'done') { setEst(null); return }
    ;(async () => {
      let argsHex
      try { argsHex = encodeUint256(initialCount) } catch { return }
      try {
        const data = DEMO_CONTRACT.bytecode + argsHex
        const [{ costWei }, balWei] = await Promise.all([
          estimateDeploy(evmWallet.provider, evmWallet.address, data),
          getBalanceWei(evmWallet.provider, evmWallet.address),
        ])
        if (!cancelled) setEst({ cost: formatTpot(costWei), balance: formatTpot(balWei), enough: balWei >= costWei })
      } catch { if (!cancelled) setEst(null) }
    })()
    return () => { cancelled = true }
  }, [evmWallet, initialCount, wrongChain, phase])

  const deploy = async () => {
    setError(null)
    if (!evmWallet) { onConnectEvm(); return }
    let argsHex
    try { argsHex = encodeUint256(initialCount) } catch (e) { setError(e.message); return }
    try {
      setPhase('signing')
      await ensurePortaldotChain(evmWallet.provider)
      const hash = await deployBytecode(evmWallet.provider, evmWallet.address, DEMO_CONTRACT.bytecode, argsHex)
      setTxHash(hash); setPhase('mining')
      const addr = await waitForContractAddress(evmWallet.provider, hash)
      setAddress(addr); setPhase('done')
    } catch (e) {
      setError(e?.code === 4001 ? 'You rejected the transaction in your wallet.' : (e?.message || String(e)))
      setPhase('idle')
    }
  }

  const reset = () => { setPhase('idle'); setTxHash(null); setAddress(null); setError(null) }
  const copy = () => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1800) }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
      {/* Left — the real compiled contract source */}
      <div style={{ background: 'var(--bg2)', border: `0.5px solid ${BLUE}22`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: BLUE }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{DEMO_CONTRACT.name}.sol</span>
          </div>
          <Pill color={BLUE}>{DEMO_CONTRACT.compiler}</Pill>
        </div>
        <pre style={{ margin: 0, padding: 16, fontSize: 12, lineHeight: 1.6, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', maxHeight: 360 }}>{DEMO_CONTRACT.source}</pre>
        <div style={{ padding: '8px 16px', borderTop: '0.5px solid var(--border)', fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
          Compiled with {DEMO_CONTRACT.compiler} · {(DEMO_CONTRACT.bytecode.length - 2) / 2} bytes of real EVM bytecode
        </div>
      </div>

      {/* Right — configure + deploy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Constructor</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>initialCount (uint256) — the starting value stored on-chain. Set it, then deploy.</div>
          <Field label="initialCount (uint256)" value={initialCount} onChange={setInitialCount} placeholder="42" type="number" mono accent={BLUE} hint="Whole number ≥ 0" />

          {phase === 'done' ? (
            <div style={{ background: 'var(--ok-bg)', border: `0.5px solid ${GREEN}44`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 10 }}>✅ Contract deployed</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Address</div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: BLUE, wordBreak: 'break-all', marginBottom: 12 }}>{address}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button onClick={copy} style={btn('var(--bg2)', copied ? GREEN : 'var(--text2)', 'var(--border)')}>{copied ? '✓ Copied' : 'Copy address'}</button>
                <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" style={{ ...btn('var(--bg2)', BLUE, 'var(--border)'), textDecoration: 'none' }}>View tx ↗</a>
                <a href={explorerAddress(address)} target="_blank" rel="noreferrer" style={{ ...btn('var(--bg2)', BLUE, 'var(--border)'), textDecoration: 'none' }}>Explorer ↗</a>
              </div>
              <button onClick={reset} style={{ ...btn('transparent', 'var(--text3)', 'transparent'), marginTop: 10, paddingLeft: 0 }}>Deploy another →</button>
            </div>
          ) : (
            <>
              <button onClick={deploy} disabled={busy}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: busy ? 'var(--bg3)' : BLUE, color: busy ? 'var(--text3)' : '#07101f', fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                {phase === 'signing' ? 'Confirm in your wallet…' : phase === 'mining' ? 'Deploying — mining block…' : evmWallet ? 'Deploy & Sign' : 'Connect EVM wallet to deploy'}
              </button>
              {busy && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spin" style={{ width: 12, height: 12, border: `2px solid ${BLUE}55`, borderTopColor: BLUE, borderRadius: '50%', display: 'inline-block' }} />
                  {phase === 'signing' ? 'Waiting for your signature' : txHash ? `tx ${shortAddr(txHash)} submitted` : 'Submitting'}
                </div>
              )}
              {est && !busy && (
                <div style={{ marginTop: 10, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: est.enough ? 'var(--text3)' : GOLD, lineHeight: 1.5 }}>
                  Est. gas ~{est.cost} tPOT · balance {est.balance} tPOT{!est.enough && ' — top up for gas (Discord faucet)'}
                </div>
              )}
              {error && <div style={{ marginTop: 10, fontSize: 12, color: RED, lineHeight: 1.5 }}>{error}</div>}
            </>
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: `0.5px solid ${BLUE}22`, borderRadius: 12, padding: 14 }}>
          {evmWallet ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>{evmWallet.name} connected</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: BLUE }}>{shortAddr(evmWallet.address)}</div>
              {wrongChain
                ? <div style={{ fontSize: 11, color: GOLD, marginTop: 6 }}>On chain {evmWallet.chainId} — deploy will switch you to Portaldot V3.</div>
                : <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Portaldot V3 · chain {PORTALDOT_EVM.chainId}</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>No EVM wallet connected. Use MetaMask, Rabby, or any injected wallet.</div>
              <button onClick={onConnectEvm} style={{ ...btn('transparent', BLUE, BLUE + '55'), width: '100%' }}>Connect EVM wallet</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Substrate: real ink! deploy via CodePromise ─────────────────────────── */

// Value-driven coercion so a text field maps to the right JS type for SCALE
// encoding: booleans, integers (Number, or BigInt when large), else string.
function coerceArg(raw) {
  const s = String(raw ?? '').trim()
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+$/.test(s)) {
    const n = BigInt(s)
    return (n > 9007199254740991n || n < -9007199254740991n) ? n : Number(n)
  }
  return raw
}

function SubstrateDeploy({ wallet, api, getSigner, decimals, tokenSymbol }) {
  // Pre-fill the first constructor arg with a sample so the bundled contract is
  // deploy-ready. Arg names come from the ink! metadata (e.g. initValue).
  const defaultArgs = (abiInstance, ctorIdx = 0) => {
    const o = {}
    try { (abiInstance.constructors[ctorIdx]?.args || []).forEach((a, i) => { o[a.name] = i === 0 ? '42' : '' }) } catch {}
    return o
  }
  const [tab, setTab] = useState('bundled') // bundled | upload
  const [abi, setAbi] = useState(() => { try { return new Abi(inkBundle) } catch { return null } })
  const [bundle, setBundle] = useState(inkBundle)
  const [ctorIndex, setCtorIndex] = useState(0)
  const [args, setArgs] = useState(() => { try { return defaultArgs(new Abi(inkBundle)) } catch { return {} } })
  const [refTime, setRefTime] = useState('100000000000')
  const [proofSize, setProofSize] = useState('1000000')
  const [endowment, setEndowment] = useState('0')
  const [deploying, setDeploying] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState(null)

  const showMsg = (type, text) => { setMsg({ type, text }); if (type === 'ok') setTimeout(() => setMsg(null), 8000) }

  const constructors = abi ? abi.constructors : []
  const ctor = constructors[ctorIndex]

  const loadUpload = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const a = new Abi(json)
      setAbi(a); setBundle(json); setCtorIndex(0); setArgs({}); setResult(null)
      showMsg('ok', `Loaded ${json.contract?.name || 'contract'} · ${a.constructors.length} constructor(s)`)
    } catch (e) { showMsg('err', 'Could not read .contract/.json: ' + e.message) }
  }

  const buildArgs = () => (ctor.args || []).map(a => coerceArg(args[a.name]))
  const toPlanck = (amount) => { const [w, f = ''] = String(amount).trim().split('.'); return BigInt((w || '0') + (f + '0'.repeat(decimals)).slice(0, decimals)) }

  const estimateGas = async () => {
    if (!wallet || !api) return showMsg('err', 'Connect your Substrate wallet first')
    setEstimating(true)
    try {
      const wasm = bundle.source?.wasm
      const data = ctor.toU8a(buildArgs())
      const salt = '0x' + Array.from({ length: 4 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
      const res = await api.call.contractsApi.instantiate(wallet.address, toPlanck(endowment), null, null, { Upload: wasm }, data, salt)
      const j = res.toJSON()
      if (res.result.isErr) { showMsg('err', 'Dry-run failed: ' + JSON.stringify(j.result)); setEstimating(false); return }
      setRefTime(String(Math.ceil(Number(j.gasRequired.refTime) * 1.3)))
      setProofSize(String(Math.ceil(Number(j.gasRequired.proofSize) * 1.3)))
      showMsg('ok', 'Gas estimated from a dry-run (+30% headroom).')
    } catch (e) { showMsg('err', 'Estimate failed: ' + e.message) }
    setEstimating(false)
  }

  const deploy = async () => {
    if (!wallet || !api) return showMsg('err', 'Connect your Substrate wallet first')
    setDeploying(true); setResult(null)
    try {
      const signer = await getSigner(wallet.address)
      const wasm = bundle.source?.wasm
      const code = new CodePromise(api, abi, wasm)
      const gasLimit = api.registry.createType('WeightV2', { refTime: BigInt(refTime), proofSize: BigInt(proofSize) })
      const tx = code.tx[ctor.method]({ gasLimit, storageDepositLimit: null, value: toPlanck(endowment) }, ...buildArgs())
      await new Promise((resolve, reject) => {
        tx.signAndSend(wallet.address, { signer }, (r) => {
          if (r.dispatchError) {
            const e = r.dispatchError.isModule ? api.registry.findMetaError(r.dispatchError.asModule) : null
            reject(new Error(e ? `${e.section}.${e.name}` : r.dispatchError.toString())); return
          }
          if (r.status.isInBlock) {
            let addr = r.contract?.address?.toString() || null
            if (!addr) r.events.forEach(({ event }) => { if (event.section === 'contracts' && event.method === 'Instantiated') addr = event.data[1].toString() })
            setResult({ address: addr || 'Deployed — check the explorer', txHash: r.txHash.toHex() })
            resolve()
          }
        })
      })
    } catch (e) { showMsg('err', 'Deploy failed: ' + e.message) }
    setDeploying(false)
  }

  if (result) return (
    <div style={{ background: 'var(--warn-bg)', border: `0.5px solid ${GOLD}55`, borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: GOLD, marginBottom: 6 }}>ink! contract deployed</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>{bundle.contract?.name} · {ctor.method} on Portaldot V3</div>
      <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 14, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Contract address</div>
        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: GOLD, wordBreak: 'break-all' }}>{result.address}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <a href={`${SUB_EXPLORER}/extrinsics/${result.txHash}`} target="_blank" rel="noreferrer" style={{ ...btn('var(--bg2)', BLUE, 'var(--border)'), textDecoration: 'none' }}>View tx ↗</a>
        <button onClick={() => setResult(null)} style={btn(GOLD, 'var(--bg0)', GOLD)}>Deploy another</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
      <div style={{ background: 'var(--bg2)', border: `0.5px solid ${GOLD}22`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 6, padding: 10, borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)' }}>
          <button onClick={() => { const a = new Abi(inkBundle); setTab('bundled'); setAbi(a); setBundle(inkBundle); setCtorIndex(0); setArgs(defaultArgs(a)) }} style={{ ...btn(tab === 'bundled' ? GOLD : 'transparent', tab === 'bundled' ? 'var(--bg0)' : 'var(--text2)', tab === 'bundled' ? GOLD : 'var(--border)') }}>Bundled: Incrementer</button>
          <button onClick={() => setTab('upload')} style={{ ...btn(tab === 'upload' ? GOLD : 'transparent', tab === 'upload' ? 'var(--bg0)' : 'var(--text2)', tab === 'upload' ? GOLD : 'var(--border)') }}>Upload your own</button>
        </div>
        {tab === 'bundled' ? (
          <pre style={{ margin: 0, padding: 16, fontSize: 12, lineHeight: 1.6, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', maxHeight: 360 }}>{INK_SOURCE}</pre>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>
              Upload a compiled ink! <code style={{ color: GOLD }}>.contract</code> bundle (metadata + code). Build yours with <code style={{ color: GOLD }}>cargo contract build</code>.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'var(--bg0)', border: `0.5px solid ${abi && tab === 'upload' ? GREEN : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>📁 Choose .contract / .json</span>
              <input type="file" accept=".contract,.json" onChange={e => loadUpload(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {abi && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>Loaded: {bundle.contract?.name} v{bundle.contract?.version}</div>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 18 }}>
          {constructors.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>Constructor</div>
              <select value={ctorIndex} onChange={e => { const i = Number(e.target.value); setCtorIndex(i); setArgs(defaultArgs(abi, i)) }} style={{ width: '100%', padding: '9px 12px', background: 'var(--bg0)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none' }}>
                {constructors.map((c, i) => <option key={i} value={i}>{c.method}({(c.args || []).map(a => a.name).join(', ')})</option>)}
              </select>
            </div>
          )}
          {(ctor?.args || []).map(a => (
            <Field key={a.name} label={`${a.name} (${a.type?.displayName || a.type?.type || 'value'})`} value={args[a.name] ?? ''} onChange={v => setArgs(p => ({ ...p, [a.name]: v }))} placeholder="" mono />
          ))}
          {(ctor?.args || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>No constructor arguments.</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Gas refTime" value={refTime} onChange={setRefTime} type="number" mono />
            <Field label="Gas proofSize" value={proofSize} onChange={setProofSize} type="number" mono />
          </div>
          <Field label={`Endowment (${tokenSymbol})`} value={endowment} onChange={setEndowment} type="number" mono hint={`${tokenSymbol} transferred into the contract's account at creation. 0 is fine for most contracts; raise it only if the contract must hold a balance.`} />

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={estimateGas} disabled={estimating || !wallet} style={{ ...btn('var(--bg3)', estimating || !wallet ? 'var(--text4)' : BLUE, BLUE + '44'), flexShrink: 0 }}>{estimating ? 'Estimating…' : 'Estimate gas'}</button>
            <button onClick={deploy} disabled={deploying || !wallet || !abi} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: deploying || !wallet || !abi ? 'var(--bg3)' : GOLD, color: deploying || !wallet || !abi ? 'var(--text4)' : 'var(--bg0)', fontSize: 14, fontWeight: 700, cursor: deploying || !wallet ? 'not-allowed' : 'pointer' }}>
              {deploying ? 'Deploying…' : 'Deploy & Sign'}
            </button>
          </div>
          {!wallet && <div style={{ fontSize: 11, color: RED, marginTop: 8 }}>Connect your Substrate wallet (sidebar) first</div>}
          {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.type === 'ok' ? GREEN : RED, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.text}</div>}
        </div>
        <div style={{ background: 'var(--bg2)', border: `0.5px solid ${GOLD}22`, borderRadius: 12, padding: 14, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
          Real deploy via <span style={{ color: GOLD, fontFamily: 'JetBrains Mono, monospace' }}>contracts.instantiateWithCode</span> (pallet-contracts, ink! 5). The code + contract storage are paid for by a storage deposit in {tokenSymbol}, on top of gas.
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── page shell + mode toggle ─────────────────────────── */

export function DeployContract({ wallet, api, getSigner, evmWallet, onConnectEvm, decimals = 14, tokenSymbol = 'tPOT' }) {
  const [mode, setMode] = useState('evm')

  const Tab = ({ id, accent, title, sub }) => {
    const on = mode === id
    return (
      <button onClick={() => setMode(id)} style={{ flex: 1, textAlign: 'left', padding: '14px 18px', borderRadius: 12, cursor: 'pointer', background: on ? accent + '14' : 'var(--bg1)', border: `0.5px solid ${on ? accent + '66' : 'var(--border)'}`, transition: 'all 0.15s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: on ? 'var(--text)' : 'var(--text2)' }}>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: on ? 'var(--text2)' : 'var(--text4)' }}>{sub}</div>
      </button>
    )
  }

  return (
    <div className="fadein" style={{ padding: '28px 36px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.6 }}>
        Deploy a real contract to the Portaldot V3 testnet — Solidity over EVM, or ink! / WASM over the native Substrate pallet. Both are signed by your wallet and inspectable on-chain.
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Tab id="evm" accent={BLUE} title="EVM · Solidity" sub="Set a value, sign in MetaMask" />
        <Tab id="substrate" accent={GOLD} title="Substrate · ink! / WASM" sub="Bundled contract or upload your own .contract" />
      </div>
      {mode === 'evm'
        ? <EvmDeploy evmWallet={evmWallet} onConnectEvm={onConnectEvm} />
        : <SubstrateDeploy wallet={wallet} api={api} getSigner={getSigner} decimals={decimals} tokenSymbol={tokenSymbol} />}
    </div>
  )
}
