import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { catBadge, catColors } from '../data/procedures'

function fmt(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DonutChart({ cases }) {
  const cc = {}
  cases.forEach((c) => { cc[c.category] = (cc[c.category] || 0) + 1 })
  const entries = Object.entries(cc).sort((a, b) => b[1] - a[1])
  const total = cases.length || 1
  const r = 46, cx = 60, cy = 60, sw = 18, circ = 2 * Math.PI * r
  let off = 0

  const segs = entries.map(([cat, cnt], i) => {
    const pct = cnt / total
    const color = catColors[cat] || '#4f8dff'
    const seg = (
      <circle
        key={cat}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeDashoffset={-circ * off + circ * 0.25}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ cursor: 'pointer' }}
      />
    )
    off += pct
    return seg
  })

  return (
    <div className="donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
        {segs}
        <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--text)" fontSize="16" fontFamily="Playfair Display,serif">
          {cases.length}
        </text>
        <text x={cx} y={cy + 19} textAnchor="middle" fill="var(--muted)" fontSize="8">
          CASES
        </text>
      </svg>
      <div className="donut-legend">
        {entries.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</div>
        ) : (
          entries.slice(0, 6).map(([cat, cnt], i) => (
            <div key={cat} className="legend-item">
              <div className="legend-dot" style={{ background: catColors[cat] || '#4f8dff' }} />
              <span className="legend-label">{cat}</span>
              <span className="legend-val">{cnt}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ from: '', to: '', category: '' })

  const now = new Date()
  const hr = now.getHours()
  const greeting =
    (hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') +
    ', ' +
    (user?.full_name || user?.username || '').split(' ')[0]

  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.from) params.date_from = filters.from
      if (filters.to) params.date_to = filters.to
      if (filters.category) params.category = filters.category
      const data = await api.cases.list({ ...params, per_page: 1000 })
      setCases(data.cases || [])
    } catch {
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const today = now.toISOString().slice(0, 10)

  const stats = {
    total: cases.length,
    month: cases.filter((c) => c.case_date?.startsWith(ym)).length,
    obs: cases.filter((c) => c.category === 'Obstetrics').length,
    art: cases.filter((c) => c.category === 'ART').length,
  }

  // Pregnancy check reminders: ET cases where pregnancy_check_date is set
  const pregChecks = cases
    .filter((c) => c.pregnancy_check_date)
    .sort((a, b) => a.pregnancy_check_date.localeCompare(b.pregnancy_check_date))

  const recent = cases.slice(0, 5)

  const renderPregCheck = (c) => {
    const daysUntil = Math.ceil(
      (new Date(c.pregnancy_check_date) - new Date(today)) / (1000 * 60 * 60 * 24)
    )
    const isOverdue = c.pregnancy_check_date < today
    const statusColor = isOverdue ? 'var(--rose)' : daysUntil <= 3 ? 'var(--amber)' : 'var(--teal)'
    const statusText = isOverdue
      ? 'Overdue'
      : daysUntil === 0
      ? 'Today'
      : daysUntil === 1
      ? 'Tomorrow'
      : `${daysUntil} days`

    return (
      <div
        key={c.id}
        style={{
          padding: '10px 0',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/cases')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{c.patient_id}</span>
          <span style={{ fontSize: 11, color: statusColor, fontWeight: 700 }}>{statusText}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          ET: {fmt(c.case_date)} → Check: {fmt(c.pregnancy_check_date)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}</div>
          <div className="page-sub">{dateStr}</div>
        </div>
        <button className="btn btn-glass btn-sm" onClick={() => navigate('/cases/new')} style={{ width: 'auto', marginTop: 6 }}>
          + New Case
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Filter:</span>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 12, outline: 'none' }}
        />
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>to</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 12, outline: 'none' }}
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', fontSize: 12, outline: 'none' }}
        >
          <option value="">All Categories</option>
          <option value="Obstetrics">Obstetrics</option>
          <option value="Gynaecology">Gynaecology</option>
          <option value="ART">ART</option>
        </select>
        <button
          className="btn btn-glass btn-sm"
          onClick={() => setFilters({ from: '', to: '', category: '' })}
          style={{ width: 'auto' }}
        >
          Clear
        </button>
      </div>

      {/* Stat cards */}
      <div className="stats-row">
        <div className="stat-card" onClick={() => navigate('/cases')}>
          <div className="stat-glow sg-blue" />
          <div className="stat-label">Total Cases</div>
          <div className="stat-value">{loading ? '…' : stats.total}</div>
          <div className="stat-delta">all time</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/cases')}>
          <div className="stat-glow sg-teal" />
          <div className="stat-label">This Month</div>
          <div className="stat-value">{loading ? '…' : stats.month}</div>
          <div className="stat-delta">cases logged</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/cases?category=Obstetrics')}>
          <div className="stat-glow sg-amber" />
          <div className="stat-label">Obstetrics</div>
          <div className="stat-value">{loading ? '…' : stats.obs}</div>
          <div className="stat-delta">cases</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/cases?category=ART')}>
          <div className="stat-glow sg-teal" />
          <div className="stat-label">ART</div>
          <div className="stat-value">{loading ? '…' : stats.art}</div>
          <div className="stat-delta">cases</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Pregnancy checks */}
        <div className="card">
          <div className="card-title">
            Pregnancy Checks{' '}
            <span className="card-badge">{pregChecks.length}</span>
          </div>
          {pregChecks.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '18px 0', textAlign: 'center' }}>
              No pending checks
            </div>
          ) : (
            pregChecks.slice(0, 8).map(renderPregCheck)
          )}
        </div>

        {/* Donut chart */}
        <div className="card">
          <div className="card-title">Cases by Category</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>
          ) : (
            <DonutChart cases={cases} />
          )}
        </div>

        {/* Recent cases */}
        <div className="card">
          <div className="card-title">
            Recent Cases <span className="card-badge">{cases.length}</span>
          </div>
          {recent.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '18px 0', textAlign: 'center' }}>
              No cases yet
            </div>
          ) : (
            recent.map((c) => (
              <div
                key={c.id}
                style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => navigate('/cases')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{c.patient_id}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(c.case_date)}</span>
                </div>
                <span className={`badge ${catBadge[c.category] || ''}`} style={{ fontSize: 10 }}>
                  {c.category}
                </span>
                {c.procedure && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>
                    {c.procedure}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
