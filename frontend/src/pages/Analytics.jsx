import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { catColors } from '../data/procedures'

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function fmtShort(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function BarChart({ data, max }) {
  const m = Math.max(...data.map((d) => d.cnt), max || 1)
  return (
    <div className="bar-chart">
      {data.map((w, i) => (
        <div key={i} className="bar-group">
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: `${Math.max(Math.round((w.cnt / m) * 100), w.cnt > 0 ? 4 : 0)}%` }}
              title={`${w.cnt} cases`}
            />
          </div>
          <div className="bar-label">{w.label}</div>
        </div>
      ))}
    </div>
  )
}

function DistBar({ data, colorFn }) {
  const max = data[0]?.[1] || 1
  if (data.length === 0) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</div>
  return (
    <div>
      {data.map(([label, cnt]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 130, fontSize: 12, color: 'var(--muted)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</div>
          <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: colorFn ? colorFn(label) : 'var(--blue)', width: `${(cnt / max * 100).toFixed(0)}%` }} />
          </div>
          <div style={{ width: 24, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{cnt}</div>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    api.cases
      .list({ per_page: 10000 })
      .then((d) => setCases(d.cases || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()

  // Weekly spread
  const base = new Date(now)
  base.setDate(base.getDate() + weekOffset * 7)
  const day = base.getDay()
  const mon = new Date(base)
  mon.setDate(base.getDate() - (day === 0 ? 6 : day - 1))

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayStr = isoDate(now)

  const weekDays = days.map((name, i) => {
    const d = new Date(mon.getTime() + i * 86400000)
    const ds = isoDate(d)
    return { name, num: d.getDate(), ds, count: cases.filter((c) => c.case_date === ds).length, isToday: ds === todayStr }
  })

  const weekLabel =
    weekOffset === 0
      ? 'This Week'
      : `${fmtShort(mon)} – ${fmtShort(new Date(mon.getTime() + 6 * 86400000))}`

  // 8-week bars
  const weeks8 = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now)
    end.setDate(now.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    const cnt = cases.filter((c) => c.case_date >= isoDate(start) && c.case_date <= isoDate(end)).length
    return { label: fmtShort(start), cnt }
  }).reverse()

  // Outcome stats (Obstetrics)
  const obsCases = cases.filter((c) => c.category === 'Obstetrics')
  const caesareans = cases.filter((c) => c.procedure === 'Caesarean Section').length
  const svd = cases.filter((c) => c.detail === 'SVD').length
  const withComps = obsCases.filter((c) => c.complications?.length > 0).length
  const compCounts = {}
  obsCases.forEach((c) => (c.complications || []).forEach((comp) => { compCounts[comp] = (compCounts[comp] || 0) + 1 }))
  const topComp = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]

  const outcomeStats = [
    { label: 'Caesarean Sections', val: caesareans, sub: obsCases.length ? `${((caesareans / obsCases.length) * 100).toFixed(0)}% of obs` : '—', glow: 'sg-amber' },
    { label: 'SVD Deliveries', val: svd, sub: obsCases.length ? `${((svd / obsCases.length) * 100).toFixed(0)}% of obs` : '—', glow: 'sg-teal' },
    { label: 'Cases w/ Complications', val: withComps, sub: obsCases.length ? `${((withComps / obsCases.length) * 100).toFixed(0)}% of obs` : '—', glow: 'sg-rose' },
    { label: 'Top Complication', val: topComp ? topComp[0] : 'None', sub: topComp ? `${topComp[1]} occurrence${topComp[1] === 1 ? '' : 's'}` : '—', glow: 'sg-violet' },
  ]

  // Category distribution
  const catDist = {}
  cases.forEach((c) => { catDist[c.category] = (catDist[c.category] || 0) + 1 })
  const catDistArr = Object.entries(catDist).sort((a, b) => b[1] - a[1])

  // Obstetrics breakdown
  const obsDist = {}
  obsCases.forEach((c) => {
    const key = c.detail || c.procedure || c.type
    if (key) obsDist[key] = (obsDist[key] || 0) + 1
  })
  const obsDistArr = Object.entries(obsDist).sort((a, b) => b[1] - a[1])

  if (loading) return <div className="empty"><span className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Weekly spread, procedure distribution &amp; outcome trends</div>
        </div>
      </div>

      {/* Weekly spread */}
      <div className="card">
        <div className="card-title">Weekly Consult Spread</div>
        <div className="week-nav">
          <button className="btn btn-glass btn-sm" onClick={() => setWeekOffset((w) => w - 1)} style={{ width: 30, height: 30, padding: 0 }}>‹</button>
          <div className="week-label">{weekLabel}</div>
          <button className="btn btn-glass btn-sm" onClick={() => setWeekOffset((w) => w + 1)} style={{ width: 30, height: 30, padding: 0 }}>›</button>
        </div>
        <div className="daily-grid">
          {weekDays.map(({ name, num, count, isToday }) => (
            <div key={name} className={`day-col${isToday ? ' today' : ''}`}>
              <div className="day-name">{name}</div>
              <div className="day-num">{num}</div>
              <div className={`day-count${count === 0 ? ' zero' : ''}`}>{count}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{count === 1 ? 'case' : 'cases'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 8-week bar chart */}
      <div className="card">
        <div className="card-title">Consults — Last 8 Weeks</div>
        <BarChart data={weeks8} />
      </div>

      {/* Outcome stats */}
      <div className="card">
        <div className="card-title">Outcome Tracking</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {outcomeStats.map((s) => (
            <div key={s.label} style={{ padding: '20px 22px', background: 'rgba(21,25,41,0.7)', border: '1px solid var(--border)', borderRadius: 'var(--r)', position: 'relative', overflow: 'hidden' }}>
              <div className={`stat-glow ${s.glow}`} />
              <div className="stat-label">{s.label}</div>
              <div style={{ fontFamily: 'Playfair Display,serif', fontSize: typeof s.val === 'number' ? 38 : 22, color: 'var(--text)', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 4 }}>
                {s.val}
              </div>
              <div className="stat-delta">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-title">Category Distribution</div>
          <DistBar data={catDistArr} colorFn={(cat) => catColors[cat] || 'var(--blue)'} />
        </div>
        <div className="card">
          <div className="card-title">Obstetrics Breakdown</div>
          <DistBar data={obsDistArr} colorFn={() => 'var(--amber)'} />
        </div>
      </div>
    </div>
  )
}
