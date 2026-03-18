import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { catBadge, PROC } from '../data/procedures'

function fmt(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function CaseModal({ caseData, onClose, onEdit, onDelete }) {
  if (!caseData) return null

  const procStr = [caseData.type, caseData.procedure, caseData.detail].filter(Boolean).join(' › ')

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{caseData.patient_id}</div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`badge ${catBadge[caseData.category] || ''}`}>{caseData.category}</span>
          {procStr && <span className="badge b-blue" style={{ fontSize: 10 }}>{procStr}</span>}
          {caseData.clinical_role && <span className="badge b-blue" style={{ fontSize: 10 }}>{caseData.clinical_role}</span>}
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>📅 {fmt(caseData.case_date)}</span>
        </div>

        {caseData.hospital && (
          <div className="modal-field">
            <div className="mf-label">Hospital</div>
            <div className="mf-value">{caseData.hospital}</div>
          </div>
        )}

        {caseData.prev_cs != null && (
          <div className="modal-field">
            <div className="mf-label">Previous C-Sections</div>
            <div className="mf-value">{caseData.prev_cs}</div>
          </div>
        )}

        {caseData.sterilisation && (
          <div className="modal-field">
            <div className="mf-label">Sterilisation</div>
            <div className="mf-value" style={{ color: 'var(--blue)' }}>Yes</div>
          </div>
        )}

        {caseData.pregnant && (
          <div className="modal-field">
            <div className="mf-label">Outcome</div>
            <div className="mf-value"><span className="pregnant-chip">✓ Pregnant</span></div>
          </div>
        )}

        {caseData.oocyte_data && (
          <div className="modal-field">
            <div className="mf-label">Oocyte Collection</div>
            <div className="mf-value" style={{ fontSize: 13 }}>
              Trigger: {caseData.oocyte_data.trigger || '—'} · Hours: {caseData.oocyte_data.hours ?? '—'} ·
              Follicles: {caseData.oocyte_data.follicles ?? '—'} · Eggs: {caseData.oocyte_data.eggs_retrieved ?? '—'}
              {caseData.oocyte_data.la ? ' · LA: Yes' : ''}
            </div>
          </div>
        )}

        {caseData.et_data && (
          <div className="modal-field">
            <div className="mf-label">Embryo Transfer</div>
            <div className="mf-value" style={{ fontSize: 13 }}>
              Embryos transferred: {caseData.et_data.embryos_transferred ?? '—'}
            </div>
          </div>
        )}

        {caseData.pregnancy_check_date && (
          <div className="modal-field">
            <div className="mf-label">Pregnancy Check Due</div>
            <div className="mf-value">{fmt(caseData.pregnancy_check_date)}</div>
          </div>
        )}

        {caseData.obs && (
          <div className="modal-field">
            <div className="mf-label">Clinical Notes</div>
            <div className="mf-value" style={{ whiteSpace: 'pre-wrap' }}>{caseData.obs}</div>
          </div>
        )}

        {caseData.complications?.length > 0 && (
          <div className="modal-field">
            <div className="mf-label">Complications</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {caseData.complications.map((c, i) => (
                <span key={i} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: 'rgba(251,113,133,0.12)', color: 'var(--rose)', border: '1px solid rgba(251,113,133,0.25)' }}>
                  ⚠ {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-glass btn-sm" onClick={onEdit} style={{ width: 'auto' }}>✏️ Edit</button>
          <button className="btn btn-rose btn-sm" onClick={onDelete} style={{ width: 'auto' }}>🗑 Delete</button>
          <button className="btn btn-glass btn-sm" onClick={onClose} style={{ marginLeft: 'auto', width: 'auto' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Cases() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState(searchParams.get('category') || '')
  const [filterPreg, setFilterPreg] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get('date') || '')
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get('date') || '')

  const [selected, setSelected] = useState(new Set())
  const [modalCase, setModalCase] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (search) params.search = search
      if (filterCat) params.category = filterCat
      if (filterPreg === 'yes') params.pregnant = true
      if (filterDateFrom) params.date_from = filterDateFrom
      if (filterDateTo) params.date_to = filterDateTo
      const data = await api.cases.list(params)
      setCases(data.cases || [])
      setTotal(data.total || 0)
    } catch {
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, filterCat, filterPreg, filterDateFrom, filterDateTo])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('Delete this case? This cannot be undone.')) return
    await api.cases.delete(id)
    setModalCase(null)
    load()
  }

  const handleBulkDelete = async () => {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} selected case${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    await api.cases.bulkDelete([...selected])
    setSelected(new Set())
    load()
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Case History</div>
          <div className="page-sub">All logged clinical cases</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-glass btn-sm" onClick={() => api.export.csv()} style={{ width: 'auto' }}>📤 CSV</button>
          <button className="btn btn-glass btn-sm" onClick={() => api.export.excel()} style={{ width: 'auto' }}>📊 Excel</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/cases/new')} style={{ width: 'auto' }}>+ New Case</button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="🔍  Search patient ID or notes…"
        />
        <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          <option value="Obstetrics">Obstetrics</option>
          <option value="Gynaecology">Gynaecology</option>
          <option value="ART">ART</option>
        </select>
        <select value={filterPreg} onChange={(e) => { setFilterPreg(e.target.value); setPage(1) }}>
          <option value="">Any Outcome</option>
          <option value="yes">Pregnant ✓</option>
        </select>
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
          title="From date"
        />
        <span style={{ fontSize: 11, color: 'var(--faint)', alignSelf: 'center' }}>to</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }}
          title="To date"
        />
        {(filterDateFrom || filterDateTo) && (
          <button
            className="btn btn-glass btn-sm"
            onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setPage(1) }}
            style={{ width: 'auto' }}
          >
            ✕ Date
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div style={{ marginBottom: 14, padding: 12, background: 'rgba(79,141,255,0.08)', border: '1px solid rgba(79,141,255,0.2)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{selected.size} selected</span>
            <button className="btn btn-rose btn-sm" onClick={handleBulkDelete} style={{ width: 'auto' }}>🗑 Delete Selected</button>
            <button className="btn btn-glass btn-sm" onClick={() => setSelected(new Set())} style={{ width: 'auto' }}>Clear</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : cases.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">📋</span>
          <p>No cases found</p>
        </div>
      ) : (
        <div className="case-list">
          {cases.map((c) => {
            const procStr = [c.type, c.procedure, c.detail].filter(Boolean).join(' › ')
            return (
              <div key={c.id} className="case-card" onClick={() => setModalCase(c)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--blue)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="case-pid">
                      {c.patient_id}
                      {c.pregnant && (
                        <span className="pregnant-chip" style={{ verticalAlign: 'middle', marginLeft: 8 }}>✓ Pregnant</span>
                      )}
                    </div>
                    <div className="case-meta-row">
                      <span className={`badge ${catBadge[c.category] || ''}`}>{c.category}</span>
                      {procStr && <span className="badge b-blue" style={{ fontSize: 10 }}>{procStr}</span>}
                      {c.clinical_role && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(45,212,191,0.08)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,0.2)' }}>
                          {c.clinical_role}
                        </span>
                      )}
                      {c.hospital && <span className="case-date">🏥 {c.hospital}</span>}
                      <span className="case-date">📅 {fmt(c.case_date)}</span>
                      {c.complications?.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--rose)' }}>⚠ {c.complications.length} complication{c.complications.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {c.obs && <div className="case-preview">{c.obs}</div>}
                    <div style={{ display: 'flex', gap: 7, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-glass btn-sm" onClick={() => navigate(`/cases/${c.id}/edit`)} style={{ width: 'auto' }}>✏️ Edit</button>
                      <button className="btn btn-rose btn-sm" onClick={() => handleDelete(c.id)} style={{ width: 'auto' }}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="pagination">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Per page:</span>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text)', outline: 'none' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {total > 0 ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}` : '0 results'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-glass btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ width: 'auto' }}>‹ Prev</button>
          <button className="btn btn-glass btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ width: 'auto' }}>Next ›</button>
        </div>
      </div>

      {modalCase && (
        <CaseModal
          caseData={modalCase}
          onClose={() => setModalCase(null)}
          onEdit={() => { navigate(`/cases/${modalCase.id}/edit`); setModalCase(null) }}
          onDelete={() => handleDelete(modalCase.id)}
        />
      )}
    </div>
  )
}
