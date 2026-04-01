import React, { useEffect, useState } from 'react'

interface Project {
  id: string
  name: string
  dir: string
  logCount: number
}

interface RFMScore {
  recency: number
  frequency: number
  monetary: number
  total: number
  riskOfGC: boolean
}

interface Memory {
  id: string
  content: string
  tags: string[]
  relatedTo: string[]
  ageDays: number
  rfm?: RFMScore
}

const API = 'http://localhost:7700/api'

export function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/projects`)
      .then(r => r.json())
      .then(data => {
        setProjects(data)
        if (data.length > 0) setSelected(data[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    fetch(`${API}/memories/${selected.id}`)
      .then(r => r.json())
      .then(data => { setMemories(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selected])

  // WebSocket live updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:7700')
    ws.onmessage = () => {
      if (selected) {
        fetch(`${API}/memories/${selected.id}`)
          .then(r => r.json())
          .then(setMemories)
          .catch(() => {})
      }
    }
    return () => ws.close()
  }, [selected])

  const atRisk = memories.filter(m => m.rfm?.riskOfGC)
  const totalScore = memories.length
    ? Math.round(memories.reduce((s, m) => s + (m.rfm?.total ?? 0), 0) / memories.length)
    : 0

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1>🧠 Cerebro</h1>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Claude Code Memory
        </div>
        {projects.map(p => (
          <div
            key={p.id}
            className={`project-item ${selected?.id === p.id ? 'active' : ''}`}
            onClick={() => setSelected(p)}
          >
            {p.name}
            <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{p.logCount} logs</div>
          </div>
        ))}
        {projects.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            No projects found.<br />
            Use Claude Code first.
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="main">
        {selected ? (
          <>
            <div className="header">
              <h2>{selected.name}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {memories.length} memories · {selected.logCount} log days
              </span>
            </div>

            {/* GC Alert */}
            {atRisk.length > 0 && (
              <div className="gc-alert">
                ⚠ {atRisk.length} memories at risk of GC — run{' '}
                <code>cerebro gc --threshold 7</code> to review
              </div>
            )}

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="value">{memories.length}</div>
                <div className="label">Total memories</div>
              </div>
              <div className="stat-card">
                <div className="value" style={{ color: 'var(--danger)' }}>{atRisk.length}</div>
                <div className="label">At risk of GC</div>
              </div>
              <div className="stat-card">
                <div className="value">{totalScore}</div>
                <div className="label">Avg RFM score</div>
              </div>
              <div className="stat-card">
                <div className="value">{selected.logCount}</div>
                <div className="label">Log days</div>
              </div>
            </div>

            {/* Memory list */}
            {loading ? (
              <div className="empty">Loading memories...</div>
            ) : memories.length === 0 ? (
              <div className="empty">No memories found for this project.</div>
            ) : (
              <div className="memory-list">
                {memories.map(m => (
                  <MemoryCard key={m.id} memory={m} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            Select a project from the sidebar
          </div>
        )}
      </main>
    </div>
  )
}

function MemoryCard({ memory }: { memory: Memory }) {
  const rfm = memory.rfm
  const atRisk = rfm?.riskOfGC

  return (
    <div className={`memory-card ${atRisk ? 'at-risk' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
          {memory.ageDays === 0 ? 'today' : memory.ageDays === 1 ? 'yesterday' : `${memory.ageDays}d ago`}
        </span>
        {atRisk
          ? <span className="badge danger">⚠ GC risk</span>
          : rfm && rfm.total >= 70
            ? <span className="badge success">✦ healthy</span>
            : rfm && <span className="badge warn">~ moderate</span>
        }
      </div>

      <div className="content">{memory.content.slice(0, 180)}{memory.content.length > 180 ? '...' : ''}</div>

      {rfm && (
        <div className="rfm-bar">
          <span style={{ width: 60, flexShrink: 0 }}>R {rfm.recency}</span>
          <div className="bar-wrap"><div className="bar-fill" style={{ width: `${rfm.recency}%`, background: 'var(--accent2)' }} /></div>
          <span style={{ width: 60, flexShrink: 0 }}>F {rfm.frequency}</span>
          <div className="bar-wrap"><div className="bar-fill" style={{ width: `${rfm.frequency}%`, background: 'var(--accent)' }} /></div>
          <span style={{ width: 60, flexShrink: 0 }}>M {rfm.monetary}</span>
          <div className="bar-wrap"><div className="bar-fill" style={{ width: `${rfm.monetary}%`, background: 'var(--success)' }} /></div>
          <span style={{ width: 50, flexShrink: 0, fontWeight: 'bold', color: atRisk ? 'var(--danger)' : 'var(--text)' }}>= {rfm.total}</span>
        </div>
      )}

      {memory.tags.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {memory.tags.map(t => (
            <span key={t} style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'var(--bg3)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
