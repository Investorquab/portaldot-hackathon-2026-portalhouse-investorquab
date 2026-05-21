import { useState, useRef, useEffect } from 'react'

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'

const PORTALDOT_CONTEXT = `
Portaldot is a Layer-0 blockchain built on Substrate (same tech as Polkadot).
Mission: Enable cross-chain data transfer for physical industries.
Native token: POT (12 decimals). Used as gas for all transactions.
Website: portaldot.world | GitHub: github.com/portaldotVolunteer
Docs: portaldot-dev.readthedocs.io
Discord: discord.gg/portaldot

Available pallets on the node:
- balances: transfer POT, check balance
- assets: create tokens, mint, burn, transfer custom tokens
- identity: set on-chain name, email, twitter, website
- staking: stake POT to earn rewards
- bounties: post tasks with POT rewards
- vesting: create linear unlock schedules
- uniques: NFTs
- contracts: deploy ink! smart contracts

Current node status: local dev node at ws://127.0.0.1:9944, specVersion 1002
Contracts API: v5 (only supports ink! 3.x — ink! 4.x not yet supported, team working on upgrade)

PortalHouse is a dashboard for Portaldot built by Investorquab (quabnation).
It provides: Chain Health, Transactions, Token Studio, Deploy Contract, Bounty Board, AI Assistant, My Profile.
Live at: portaldot-playground.vercel.app
`

const EXAMPLES = [
  "Send 10 POT to 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "Create a token called QUAB with 5 million supply",
  "What is Portaldot building?",
  "Explain what balances.transferKeepAlive means",
  "How do I stake my POT?",
  "What pallets are available on the node?",
]

function short(addr) {
  if (!addr) return '—'
  return addr.slice(0, 8) + '...' + addr.slice(-6)
}

function clean(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.+?)`/g, '$1')
    .trim()
}

function Msg({ msg, onExecute }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: isUser ? 'linear-gradient(135deg, #c9a84c, #e8a530)' : '#111520', border: isUser ? 'none' : '0.5px solid #1e2433', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isUser ? '#0a0d13' : '#c9a84c' }}>
        {isUser ? 'U' : '⬡'}
      </div>
      <div style={{ maxWidth: '78%' }}>
        <div style={{ padding: '10px 14px', borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px', background: isUser ? '#1a2535' : '#111520', border: `0.5px solid ${isUser ? '#2a3550' : '#1e2433'}`, fontSize: 13, color: '#e0e2ea', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {msg.content}
          {msg.loading && <span style={{ animation: 'pulse 1s infinite', display: 'inline-block', marginLeft: 4 }}>▋</span>}
        </div>
        {msg.action && !msg.executed && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#4caf82', marginBottom: 6, fontWeight: 600 }}>TRANSACTION READY</div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#8891a8', marginBottom: 8 }}>
              {msg.action.description}
            </div>
            <button onClick={() => onExecute(msg.action)} style={{ padding: '7px 16px', background: '#c9a84c', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#0a0d13', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Sign & Execute
            </button>
          </div>
        )}
        {msg.executed && (
          <div style={{ marginTop: 8, padding: '8px 14px', background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 8, fontSize: 12, color: '#4caf82' }}>
            ✓ Transaction executed
          </div>
        )}
      </div>
    </div>
  )
}

export function AiAssistant({ wallet, api, recentTxs, chainInfo, bestBlock, getSigner }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your Portaldot AI Assistant.\n\nI can answer questions about Portaldot AND execute transactions for you. Just tell me what you want to do:\n\n• "Send 10 POT to 5EHmLt..."\n• "Create a token called QUAB with 5 million supply"\n• "What is Portaldot building?"\n• "Explain my last transaction"\n\nWhat would you like to do?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || '')
  const [showKey, setShowKey] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [executingId, setExecutingId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const parseAction = (text) => {
    // Try to extract JSON action block from AI response
    const match = text.match(/\[ACTION:(.*?)\]/s)
    if (!match) return null
    try { return JSON.parse(match[1].trim()) } catch { return null }
  }

  const executeAction = async (action, msgIndex) => {
    if (!wallet || !api) return
    setExecutingId(msgIndex)
    try {
      const signer = await getSigner(wallet.address)
      let tx

      if (action.type === 'transfer') {
        tx = api.tx.balances.transferKeepAlive(action.to, BigInt(Math.floor(parseFloat(action.amount) * 1e12)))
      } else if (action.type === 'createToken') {
        const id = Math.floor(Math.random() * 9000) + 1000
        tx = api.tx.utility.batchAll([
          api.tx.assets.create(id, wallet.address, 1),
          api.tx.assets.setMetadata(id, action.name, action.symbol || action.name.slice(0,4).toUpperCase(), 12),
          api.tx.assets.mint(id, wallet.address, action.supply),
        ])
      } else if (action.type === 'setIdentity') {
        tx = api.tx.identity.setIdentity({
          display: { Raw: action.display },
          email: action.email ? { Raw: action.email } : { None: null },
          twitter: action.twitter ? { Raw: action.twitter } : { None: null },
          web: { None: null }, legal: { None: null }, riot: { None: null }, image: { None: null }, pgpFingerprint: null, additional: [],
        })
      } else {
        throw new Error('Unknown action type')
      }

      await new Promise((resolve, reject) => {
        tx.signAndSend(wallet.address, { signer }, ({ status, dispatchError }) => {
          if (dispatchError) { reject(new Error(dispatchError.toString())); return }
          if (status.isInBlock) {
            setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, executed: true } : m))
            resolve()
          }
        })
      })

      setMessages(prev => [...prev, { role: 'assistant', content: `Transaction confirmed on-chain! ${action.type === 'transfer' ? `Sent ${action.amount} POT to ${short(action.to)}.` : action.type === 'createToken' ? `Token ${action.name} created successfully.` : 'Done.'}` }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Transaction failed: ${err.message}` }])
    }
    setExecutingId(null)
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const key = groqKey || localStorage.getItem('groq_key')
    if (!key) { setShowKey(true); return }

    const userMsg = { role: 'user', content: input.trim() }
    const msgIndex = messages.length + 1
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', loading: true }])
    setInput('')
    setLoading(true)

    try {
      const context = [
        chainInfo ? `Chain: ${chainInfo.chain} | Node: ${chainInfo.name} v${chainInfo.version}` : '',
        bestBlock ? `Current block: #${bestBlock.number}` : '',
        wallet ? `Connected wallet: ${wallet.address} | Balance: ${wallet.balance}` : 'No wallet connected',
        recentTxs?.length > 0 ? `Recent transactions: ${recentTxs.slice(0,5).map(t => `${t.method}.${t.call} at #${t.block}`).join(', ')}` : '',
      ].filter(Boolean).join('\n')

      const systemPrompt = `You are the AI assistant for PortalHouse, a dashboard for the Portaldot blockchain.

PORTALDOT KNOWLEDGE:
${PORTALDOT_CONTEXT}

CURRENT STATE:
${context}

CAPABILITIES:
You can execute blockchain transactions by including an [ACTION:...] tag in your response.

For sending POT: [ACTION:{"type":"transfer","to":"ADDRESS","amount":"AMOUNT","description":"Send X POT to ADDRESS"}]
For creating token: [ACTION:{"type":"createToken","name":"NAME","symbol":"SYM","supply":"AMOUNT","description":"Create token NAME"}]
For setting identity: [ACTION:{"type":"setIdentity","display":"NAME","email":"EMAIL","twitter":"@HANDLE","description":"Set identity to NAME"}]

RULES:
- If user asks to send POT or transfer, extract address and amount, include ACTION tag
- If user asks to create a token, extract name and supply, include ACTION tag  
- Always confirm details before action: "I'll send X POT to ADDRESS — click Sign & Execute below"
- Answer Portaldot questions accurately using the knowledge above
- Keep responses concise and clear, no markdown formatting
- If asked about docs, link to portaldot-dev.readthedocs.io
- If no wallet connected and action requested, say "Connect your wallet first"`

      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.filter(m => !m.loading && m.content).map(m => ({ role: m.role, content: m.content })),
            userMsg,
          ],
          max_tokens: 600,
          temperature: 0.5,
        })
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      const rawReply = data.choices[0].message.content
      const action = parseAction(rawReply)
      const displayReply = clean(rawReply.replace(/\[ACTION:.*?\]/s, '').trim())

      setMessages(prev => prev.map((m, i) =>
        m.loading ? { role: 'assistant', content: displayReply, action, executed: false } : m
      ))
    } catch (err) {
      setMessages(prev => prev.map(m => m.loading ? { role: 'assistant', content: `Error: ${err.message}` } : m))
    }
    setLoading(false)
  }

  const analyzeProfile = async () => {
    const key = groqKey || localStorage.getItem('groq_key')
    if (!key) { setShowKey(true); return }
    if (!wallet) return
    setAnalyzing(true)
    try {
      const myTxs = recentTxs?.filter(t => t.signer === wallet.address) || []
      const prompt = `Analyze this Portaldot wallet briefly (max 150 words, no markdown):\n\nAddress: ${wallet.address}\nBalance: ${wallet.balance}\nMy transactions seen: ${myTxs.length}\nChain block: #${bestBlock?.number || '?'}\nRecent activity: ${recentTxs?.slice(0,10).map(t => `${t.method}.${t.call}`).join(', ') || 'none'}\n\nGive: 1) brief summary 2) what actions were taken 3) 2 suggestions for next steps on Portaldot.`
      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.7 })
      })
      const data = await res.json()
      setAnalysis(clean(data.choices[0].message.content))
    } catch (err) { setAnalysis(`Error: ${err.message}`) }
    setAnalyzing(false)
  }

  const tab = (t) => ({ flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif', background: activeTab === t ? '#1a2535' : 'transparent', color: activeTab === t ? '#c9a84c' : '#4a5266', transition: 'all 0.15s' })

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      {showKey && (
        <div style={{ background: '#111520', border: '0.5px solid #c9a84c44', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#c9a84c', fontWeight: 600, marginBottom: 6 }}>Groq API Key Required</div>
          <div style={{ fontSize: 12, color: '#6b7591', marginBottom: 10 }}>Free at console.groq.com — no credit card needed</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_..." style={{ flex: 1, padding: '8px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
            <button onClick={() => { localStorage.setItem('groq_key', groqKey); setShowKey(false) }} style={{ padding: '8px 16px', background: '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#0a0d13', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Save</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        <button style={tab('chat')} onClick={() => setActiveTab('chat')}>💬 AI Chat</button>
        <button style={tab('analysis')} onClick={() => setActiveTab('analysis')}>📊 Profile Analysis</button>
      </div>

      {activeTab === 'chat' && (
        <>
          <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, minHeight: 300, maxHeight: 460, overflowY: 'auto', marginBottom: 12 }}>
            {messages.map((msg, i) => (
              <Msg key={i} msg={msg} onExecute={(action) => executeAction(action, i)} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {EXAMPLES.slice(0, 4).map(ex => (
              <button key={ex} onClick={() => setInput(ex)} style={{ padding: '4px 10px', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 20, fontSize: 11, color: '#6b7591', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.target.style.borderColor='#c9a84c'; e.target.style.color='#c9a84c' }}
                onMouseLeave={e => { e.target.style.borderColor='#1e2433'; e.target.style.color='#6b7591' }}
              >{ex}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder='Ask anything or type a command like "send 5 POT to 5EHmLt..."' disabled={loading}
              style={{ flex: 1, padding: '10px 14px', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'Inter, sans-serif' }}
              onFocus={e => e.target.style.borderColor='#c9a84c'} onBlur={e => e.target.style.borderColor='#1e2433'}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{ padding: '10px 20px', background: loading ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: loading ? '#4a5266' : '#0a0d13', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
              {loading ? '...' : 'Send'}
            </button>
          </div>
          {!groqKey && <div style={{ marginTop: 8, fontSize: 11, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>⚡ <span style={{ color: '#c9a84c', cursor: 'pointer' }} onClick={() => setShowKey(true)}>Add free Groq API key</span> to activate</div>}
        </>
      )}

      {activeTab === 'analysis' && (
        <div>
          {!wallet ? (
            <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
              <div style={{ fontSize: 14, color: '#8891a8' }}>Connect your wallet to analyze your on-chain activity</div>
            </div>
          ) : (
            <>
              <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e2ea', marginBottom: 4 }}>Wallet Activity</div>
                    <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591' }}>{wallet.address}</div>
                  </div>
                  <button onClick={analyzeProfile} disabled={analyzing} style={{ padding: '8px 16px', background: analyzing ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: analyzing ? '#4a5266' : '#0a0d13', cursor: analyzing ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {analyzing ? 'Analyzing...' : '⚡ Analyze'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[['Balance', wallet.balance], ['My Txs', `${(recentTxs?.filter(t => t.signer === wallet.address).length || 0)} seen`], ['Block', bestBlock ? `#${bestBlock.number}` : '—']].map(([l, v]) => (
                    <div key={l} style={{ background: '#0e1117', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: '#4a5266', marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#c9a84c', fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {analysis ? (
                <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>AI Analysis</div>
                  <div style={{ fontSize: 13, color: '#e0e2ea', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{analysis}</div>
                  <button onClick={analyzeProfile} style={{ marginTop: 12, padding: '6px 14px', background: '#1a1f2e', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#8891a8', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>↻ Re-analyze</button>
                </div>
              ) : (
                <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 30, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
                  <div style={{ fontSize: 13, color: '#6b7591' }}>Click Analyze to get AI insights about your wallet</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
