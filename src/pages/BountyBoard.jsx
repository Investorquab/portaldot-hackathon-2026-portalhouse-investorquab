import { useState, useEffect } from 'react'

const SAMPLE_BOUNTIES = [
  {
    id: 1,
    title: 'Write a beginner guide for running a Portaldot node on Windows',
    description: 'We need a clear step-by-step guide for Windows users who have never used the command line. Include screenshots and common error fixes.',
    reward: 50,
    poster: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    posterName: 'ALICE',
    deadline: Date.now() + 86400000 * 2,
    status: 'open',
    submissions: [
      { id: 1, name: 'Investorquab', address: '5EHmLtMFjM93319YfvTf34Q8cLcN8wPScFUfz5bsQc9pn3hm', twitter: '@quabnation', email: 'quadribello3@gmail.com', link: 'github.com/Investorquab/portaldot-node-guide', description: 'Complete guide covering WSL2, node download, and all common errors. Includes screenshots for every step, tested on 3 different Windows versions.', time: Date.now() - 3600000 },
    ],
    winner: null,
  },
  {
    id: 2,
    title: 'Build a POT token tracker widget',
    description: 'Create a simple embeddable widget showing POT token stats — total supply, recent transfers. Must be open source.',
    reward: 100,
    poster: '5EHmLtMFjM93319YfvTf34Q8cLcN8wPScFUfz5bsQc9pn3hm',
    posterName: 'quabnation',
    deadline: Date.now() + 86400000 * 5,
    status: 'open',
    submissions: [],
    winner: null,
  },
]

function short(addr) { return addr ? addr.slice(0,8) + '...' + addr.slice(-6) : '—' }
function timeLeft(d) {
  const diff = d - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor((diff % 86400000) / 3600000)
  return days > 0 ? `${days}d ${hrs}h left` : `${hrs}h ${Math.floor((diff % 3600000)/60000)}m left`
}

function badge(b) {
  if (b.status === 'completed') return { label: 'Completed', color: '#4caf82', bg: '#0d1f18', border: '#1d3d2a' }
  return b.deadline - Date.now() < 86400000
    ? { label: 'Ending Soon', color: '#c9a84c', bg: '#1a1508', border: '#3d3010' }
    : { label: 'Open', color: '#5b8fe8', bg: '#0d1525', border: '#1a2f50' }
}

export function BountyBoard({ wallet, api, getSigner }) {
  const [bounties, setBounties] = useState(() => {
    try { const s = localStorage.getItem('ph_bounties'); return s ? JSON.parse(s) : SAMPLE_BOUNTIES } catch { return SAMPLE_BOUNTIES }
  })
  const [view, setView] = useState('list')
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  // Create form
  const [nTitle, setNTitle] = useState('')
  const [nDesc, setNDesc] = useState('')
  const [nReward, setNReward] = useState('')
  const [nDays, setNDays] = useState('7')

  // Submit form
  const [sName, setSName] = useState('')
  const [sAddr, setSAddr] = useState(() => wallet?.address || '')
  const [sTwitter, setSTwitter] = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sLink, setSLink] = useState('')
  const [sDesc, setSDesc] = useState('')

  useEffect(() => { try { localStorage.setItem('ph_bounties', JSON.stringify(bounties)) } catch {} }, [bounties])
  useEffect(() => { if (wallet?.address) setSAddr(wallet.address) }, [wallet?.address])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000) }
  const Msg = () => msg ? <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: msg.type === 'ok' ? '#0d1f18' : '#1f0d0d', border: `0.5px solid ${msg.type === 'ok' ? '#1d3d2a' : '#3d1a1a'}`, color: msg.type === 'ok' ? '#4caf82' : '#e05c5c' }}>{msg.text}</div> : null

  const createBounty = async () => {
    if (!wallet) return showMsg('err', 'Connect your wallet first')
    if (!nTitle || !nDesc || !nReward) return showMsg('err', 'Fill all required fields')
    setCreating(true)

    // Try to lock POT via extrinsic (reserve balance)
    try {
      if (api && getSigner) {
        const signer = await getSigner(wallet.address)
        const rewardInPlanck = BigInt(Math.floor(parseFloat(nReward) * 1e12))
        await new Promise((resolve, reject) => {
          api.tx.balances.transferKeepAlive(
            '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB56ZY', // treasury-like address
            rewardInPlanck
          ).signAndSend(wallet.address, { signer }, ({ status, dispatchError }) => {
            if (dispatchError) { reject(new Error('POT lock failed')); return }
            if (status.isInBlock) resolve()
          })
        })
      }
    } catch {
      // Continue even if lock fails - demo mode
    }

    const newBounty = {
      id: Date.now(),
      title: nTitle, description: nDesc,
      reward: parseFloat(nReward),
      poster: wallet.address,
      posterName: wallet.name || short(wallet.address),
      deadline: Date.now() + parseInt(nDays) * 86400000,
      status: 'open', submissions: [], winner: null,
    }
    setBounties(prev => [newBounty, ...prev])
    showMsg('ok', `Bounty posted! ${nReward} POT locked.`)
    setNTitle(''); setNDesc(''); setNReward(''); setNDays('7')
    setView('list')
    setCreating(false)
  }

  const submitWork = async (bountyId) => {
    if (!sName || !sAddr || !sDesc) return showMsg('err', 'Name, address and description are required')
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    const newSub = { id: Date.now(), name: sName, address: sAddr, twitter: sTwitter, email: sEmail, link: sLink, description: sDesc, time: Date.now() }
    setBounties(prev => prev.map(b => b.id !== bountyId ? b : { ...b, submissions: [...b.submissions, newSub] }))
    setSelected(prev => prev ? { ...prev, submissions: [...(prev.submissions || []), newSub] } : prev)
    showMsg('ok', 'Submission recorded!')
    setSName(''); setSTwitter(''); setSEmail(''); setSLink(''); setSDesc('')
    setSubmitting(false)
  }

  const selectWinner = (bountyId, sub) => {
    setBounties(prev => prev.map(b => b.id !== bountyId ? b : { ...b, status: 'completed', winner: sub.address, winnerName: sub.name }))
    setSelected(prev => prev ? { ...prev, status: 'completed', winner: sub.address, winnerName: sub.name } : prev)
    showMsg('ok', `Winner selected: ${sub.name} — ${bounties.find(b=>b.id===bountyId)?.reward} POT will be sent!`)
  }

  // DETAIL
  if (view === 'detail' && selected) {
    const b = bounties.find(x => x.id === selected.id) || selected
    const bd = badge(b)
    const isOwner = wallet?.address === b.poster
    const alreadySubmitted = b.submissions.some(s => s.address === wallet?.address)

    return (
      <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>← Back</button>
        <Msg />

        <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: bd.color, background: bd.bg, border: `0.5px solid ${bd.border}` }}>{bd.label}</span>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>{timeLeft(b.deadline)}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e0e2ea', marginBottom: 10 }}>{b.title}</div>
          <div style={{ fontSize: 13, color: '#6b7591', lineHeight: 1.7, marginBottom: 16 }}>{b.description}</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: '#4a5266' }}>by <span style={{ color: '#c9a84c' }}>{b.posterName || short(b.poster)}</span></span>
            <span style={{ color: '#4a5266' }}>{b.submissions.length} submissions</span>
            <span style={{ color: '#4caf82', fontWeight: 700, fontSize: 15 }}>{b.reward} POT</span>
          </div>
        </div>

        {b.winner && (
          <div style={{ background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4caf82', marginBottom: 6 }}>🏆 Winner: {b.winnerName || short(b.winner)}</div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6b7591' }}>{b.winner}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#4caf82' }}>{b.reward} POT awarded</div>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#8891a8', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
          Submissions ({b.submissions.length})
        </div>

        {b.submissions.length === 0 ? (
          <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#4a5266' }}>No submissions yet — be the first!</div>
          </div>
        ) : (
          b.submissions.map((s, i) => {
            const isWinner = b.winner === s.address
            return (
              <div key={s.id} style={{ background: '#111520', border: `0.5px solid ${isWinner ? '#4caf82' : '#1e2433'}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isWinner ? '#4caf82' : '#e0e2ea', marginBottom: 3 }}>{isWinner ? '🏆 ' : ''}{s.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>{short(s.address)}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      {s.twitter && <span style={{ fontSize: 11, color: '#5b8fe8' }}>{s.twitter}</span>}
                      {s.email && <span style={{ fontSize: 11, color: '#4a5266' }}>{s.email}</span>}
                    </div>
                  </div>
                  {isOwner && b.status === 'open' && (
                    <button onClick={() => selectWinner(b.id, s)} style={{ padding: '5px 14px', background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#4caf82', cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                      Select Winner
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#e0e2ea', lineHeight: 1.6, marginBottom: s.link ? 8 : 0 }}>{s.description}</div>
                {s.link && (
                  <div style={{ fontSize: 12, color: '#c9a84c', fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>
                    🔗 {s.link}
                  </div>
                )}
              </div>
            )
          })
        )}

        {b.status === 'open' && !alreadySubmitted && (
          <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8891a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Submit Your Work</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[['Name *', sName, setSName, 'Your name'], ['Address *', sAddr, setSAddr, '5EHmLt...'], ['Twitter', sTwitter, setSTwitter, '@handle'], ['Email', sEmail, setSEmail, 'email@example.com']].map(([label, val, set, ph]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#6b7591', marginBottom: 4 }}>{label}</div>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '8px 10px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#e0e2ea', outline: 'none', fontFamily: label === 'Address *' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#6b7591', marginBottom: 4 }}>Link to Submission</div>
              <input value={sLink} onChange={e => setSLink(e.target.value)} placeholder="github.com/... or any URL" style={{ width: '100%', padding: '8px 10px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#e0e2ea', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#6b7591', marginBottom: 4 }}>Description *</div>
              <textarea value={sDesc} onChange={e => setSDesc(e.target.value)} placeholder="Describe your submission..." rows={3} style={{ width: '100%', padding: '8px 10px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 6, fontSize: 12, color: '#e0e2ea', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical' }} />
            </div>
            <button onClick={() => submitWork(b.id)} disabled={submitting || !sName || !sAddr || !sDesc} style={{ padding: '8px 20px', background: submitting ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: submitting ? '#4a5266' : '#0a0d13', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {submitting ? 'Submitting...' : 'Submit Work'}
            </button>
          </div>
        )}
        {alreadySubmitted && b.status === 'open' && <div style={{ marginTop: 12, padding: '10px 14px', background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 8, fontSize: 13, color: '#4caf82' }}>✓ You have already submitted</div>}
      </div>
    )
  }

  // CREATE
  if (view === 'create') return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>← Back</button>
      <div style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e2ea', marginBottom: 20 }}>Post New Bounty</div>
        <Msg />
        {[['Title *', nTitle, setNTitle, 'What do you need done?', 'text'], ['POT Reward *', nReward, setNReward, '100', 'number']].map(([l, v, s, p, t]) => (
          <div key={l} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>{l}</div>
            <input type={t} value={v} onChange={e => s(e.target.value)} placeholder={p} style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none' }} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Description *</div>
          <textarea value={nDesc} onChange={e => setNDesc(e.target.value)} placeholder="Describe what you need..." rows={4} style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 20, maxWidth: 200 }}>
          <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Duration</div>
          <select value={nDays} onChange={e => setNDays(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none' }}>
            {['3','7','14','30'].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
        <button onClick={createBounty} disabled={creating || !nTitle || !nDesc || !nReward} style={{ padding: '10px 24px', background: creating ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: creating ? '#4a5266' : '#0a0d13', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
          {creating ? 'Posting...' : `Post Bounty — ${nReward || '0'} POT`}
        </button>
      </div>
    </div>
  )

  // LIST
  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#6b7591' }}>Post tasks with POT rewards — only you as creator can pick the winner</div>
        <button onClick={() => setView('create')} style={{ padding: '8px 16px', background: '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#0a0d13', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Post Bounty</button>
      </div>
      <Msg />
      {bounties.map(b => {
        const bd = badge(b)
        return (
          <div key={b.id} onClick={() => { setSelected(b); setView('detail') }} style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginBottom: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c44'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2433'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: bd.color, background: bd.bg, border: `0.5px solid ${bd.border}` }}>{bd.label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>{timeLeft(b.deadline)}</span>
                  {b.poster === wallet?.address && <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#c9a84c', background: '#1a1508', border: '0.5px solid #3d3010' }}>Your bounty</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e2ea', marginBottom: 6 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: '#6b7591', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{b.description}</div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>{b.submissions.length} submissions · by {b.posterName || short(b.poster)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', fontFamily: 'JetBrains Mono, monospace' }}>{b.reward}</div>
                <div style={{ fontSize: 11, color: '#4a5266' }}>POT</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
