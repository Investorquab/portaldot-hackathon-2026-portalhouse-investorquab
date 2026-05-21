import { useState, useEffect } from 'react'

const MOCK_PROPOSALS = [
  {
    id: 1,
    title: 'Add cross-chain bridge support to PortalHouse',
    description: 'Integrate Portaldot\'s Layer-0 cross-chain features directly into PortalHouse UI so users can bridge assets without leaving the app.',
    proposer: '5EHmLtMFjM93319YfvTf34Q8cLcN8wPScFUfz5bsQc9pn3hm',
    yes: 12,
    no: 3,
    deadline: Date.now() + 86400000 * 3,
    status: 'active',
    voted: null,
  },
  {
    id: 2,
    title: 'Set minimum stake to 100 POT',
    description: 'Proposal to set the minimum staking amount to 100 POT to prevent spam staking and ensure validators have meaningful skin in the game.',
    proposer: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    yes: 8,
    no: 7,
    deadline: Date.now() + 86400000,
    status: 'active',
    voted: null,
  },
  {
    id: 3,
    title: 'Fund PortalHouse development from treasury',
    description: 'Allocate 10,000 POT from the treasury to fund continued development of the PortalHouse dashboard and developer tools.',
    proposer: '5EHmLtMFjM93319YfvTf34Q8cLcN8wPScFUfz5bsQc9pn3hm',
    yes: 21,
    no: 2,
    deadline: Date.now() - 86400000,
    status: 'passed',
    voted: 'yes',
  },
]

function timeLeft(deadline) {
  const diff = deadline - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h left`
  const mins = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${mins}m left`
}

function short(addr) {
  if (!addr) return '—'
  return addr.slice(0, 8) + '...' + addr.slice(-6)
}

function VoteBar({ yes, no }) {
  const total = yes + no
  const yesPct = total === 0 ? 50 : Math.round((yes / total) * 100)
  const noPct = 100 - yesPct
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>
        <span style={{ color: '#4caf82' }}>YES {yesPct}%</span>
        <span style={{ color: '#e05c5c' }}>NO {noPct}%</span>
      </div>
      <div style={{ height: 6, background: '#1a1f2e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${yesPct}%`, background: 'linear-gradient(90deg, #4caf82, #2d8f5f)', borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5266', marginTop: 4 }}>
        <span>{yes} votes</span>
        <span>{no} votes</span>
      </div>
    </div>
  )
}

export function SignalBoard({ wallet, api, getSigner }) {
  const [proposals, setProposals] = useState(() => {
    try {
      const saved = localStorage.getItem('signal_proposals')
      return saved ? JSON.parse(saved) : MOCK_PROPOSALS
    } catch { return MOCK_PROPOSALS }
  })

  // Persist proposals to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem('signal_proposals', JSON.stringify(proposals)) } catch {}
  }, [proposals])
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('3')
  const [filter, setFilter] = useState('all')
  const [voting, setVoting] = useState(null)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    try { localStorage.setItem('signal_proposals', JSON.stringify(proposals)) } catch {}
  }, [proposals])

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const vote = async (proposalId, choice) => {
    if (!wallet) return showMsg('err', 'Connect your wallet to vote')
    setVoting(proposalId + choice)

    // Simulate on-chain vote (real version uses ink! contract)
    await new Promise(r => setTimeout(r, 1200))

    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId || p.voted) return p
      return {
        ...p,
        yes: choice === 'yes' ? p.yes + 1 : p.yes,
        no: choice === 'no' ? p.no + 1 : p.no,
        voted: choice,
      }
    }))
    showMsg('ok', `Voted ${choice.toUpperCase()} on proposal #${proposalId}`)
    setVoting(null)
  }

  const createProposal = async () => {
    if (!wallet) return showMsg('err', 'Connect your wallet first')
    if (!title || !description) return showMsg('err', 'Fill in title and description')
    setCreating(true)

    await new Promise(r => setTimeout(r, 1500))

    const newProposal = {
      id: proposals.length + 1,
      title,
      description,
      proposer: wallet.address,
      yes: 0,
      no: 0,
      deadline: Date.now() + parseInt(duration) * 86400000,
      status: 'active',
      voted: null,
    }
    setProposals(prev => [newProposal, ...prev])
    showMsg('ok', 'Proposal created successfully!')
    setTitle(''); setDescription(''); setDuration('3')
    setShowCreate(false)
    setCreating(false)
  }

  const filtered = proposals.filter(p => {
    if (filter === 'active') return p.status === 'active'
    if (filter === 'passed') return p.status === 'passed'
    if (filter === 'failed') return p.status === 'failed'
    return true
  })

  const statusBadge = (p) => {
    if (p.status === 'passed') return { label: 'Passed', color: '#4caf82', bg: '#0d1f18', border: '#1d3d2a' }
    if (p.status === 'failed') return { label: 'Failed', color: '#e05c5c', bg: '#1f0d0d', border: '#3d1a1a' }
    const urgent = p.deadline - Date.now() < 86400000
    return { label: urgent ? '⚡ Ending Soon' : 'Active', color: urgent ? '#c9a84c' : '#5b8fe8', bg: urgent ? '#1a1508' : '#0d1525', border: urgent ? '#3d3010' : '#1a2f50' }
  }

  return (
    <div className="fadein" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#6b7591' }}>
          Community proposals — vote with your POT wallet
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '8px 16px', background: showCreate ? '#1a1f2e' : '#c9a84c',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: showCreate ? '#6b7591' : '#0a0d13', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {showCreate ? 'Cancel' : '+ New Proposal'}
        </button>
      </div>

      {/* Alert */}
      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: msg.type === 'ok' ? '#0d1f18' : '#1f0d0d',
          border: `0.5px solid ${msg.type === 'ok' ? '#1d3d2a' : '#3d1a1a'}`,
          color: msg.type === 'ok' ? '#4caf82' : '#e05c5c',
        }}>{msg.text}</div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#111520', border: '0.5px solid #c9a84c44', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#c9a84c', marginBottom: 16 }}>New Proposal</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Title *</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you proposing?" style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Description *</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain your proposal in detail..." rows={4} style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 16, maxWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#8891a8', marginBottom: 5 }}>Voting Duration</div>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#0a0d13', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 13, color: '#e0e2ea', outline: 'none' }}>
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </div>
          <button onClick={createProposal} disabled={creating || !title || !description} style={{ padding: '8px 20px', background: creating ? '#1a1f2e' : '#c9a84c', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: creating ? '#4a5266' : '#0a0d13', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {creating ? 'Creating...' : 'Submit Proposal'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, padding: 4 }}>
        {['all', 'active', 'passed', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none', fontFamily: 'Inter, sans-serif',
            background: filter === f ? '#1a2535' : 'transparent',
            color: filter === f ? '#c9a84c' : '#4a5266',
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Proposals */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🗳️</div>
          <div style={{ fontSize: 14, color: '#6b7591' }}>No proposals yet</div>
          <div style={{ fontSize: 12, color: '#4a5266', marginTop: 6 }}>Be the first to create one</div>
        </div>
      ) : (
        filtered.map(p => {
          const badge = statusBadge(p)
          const isVoting = voting === p.id + 'yes' || voting === p.id + 'no'
          return (
            <div key={p.id} style={{ background: '#111520', border: '0.5px solid #1e2433', borderRadius: 10, padding: 20, marginBottom: 12 }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4a5266' }}>#{p.id}</span>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: badge.color, background: badge.bg, border: `0.5px solid ${badge.border}` }}>{badge.label}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e2ea', marginBottom: 8 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7591', lineHeight: 1.6 }}>{p.description}</div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
                <span>by {short(p.proposer)}</span>
                <span>·</span>
                <span>{timeLeft(p.deadline)}</span>
                <span>·</span>
                <span>{p.yes + p.no} votes</span>
              </div>

              {/* Vote bar */}
              <div style={{ marginBottom: 16 }}>
                <VoteBar yes={p.yes} no={p.no} />
              </div>

              {/* Vote buttons */}
              {p.status === 'active' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {p.voted ? (
                    <span style={{ fontSize: 12, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
                      You voted <span style={{ color: p.voted === 'yes' ? '#4caf82' : '#e05c5c', fontWeight: 600 }}>{p.voted.toUpperCase()}</span>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => vote(p.id, 'yes')} disabled={isVoting} style={{ padding: '7px 20px', background: '#0d1f18', border: '0.5px solid #1d3d2a', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#4caf82', cursor: isVoting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: isVoting ? 0.6 : 1 }}>
                        {isVoting ? '...' : '✓ Yes'}
                      </button>
                      <button onClick={() => vote(p.id, 'no')} disabled={isVoting} style={{ padding: '7px 20px', background: '#1f0d0d', border: '0.5px solid #3d1a1a', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#e05c5c', cursor: isVoting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: isVoting ? 0.6 : 1 }}>
                        {isVoting ? '...' : '✗ No'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Note */}
      <div style={{ marginTop: 16, padding: '10px 14px', background: '#111520', border: '0.5px solid #1e2433', borderRadius: 8, fontSize: 12, color: '#4a5266', fontFamily: 'JetBrains Mono, monospace' }}>
        ℹ️ Signal Board uses an ink! smart contract for on-chain voting. Contract deployment coming in next update.
      </div>
    </div>
  )
}
