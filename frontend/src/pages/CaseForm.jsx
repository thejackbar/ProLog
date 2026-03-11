import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { PROC, getProcTypes, getProcProcedures, getProcDetails, isTerminalType } from '../data/procedures'

const COMPLICATIONS = [
  { id: 'pph', label: 'PPH' },
  { id: 'shoulder', label: 'Shoulder Dystocia' },
  { id: 'ph', label: 'pH < 7' },
  { id: 'tear3', label: '3rd Degree Tear' },
  { id: 'other', label: 'Other' },
]

function Toggle({ checked, onChange, label, desc, variant }) {
  const cls = ['toggle-row', variant, checked ? 'checked' : ''].filter(Boolean).join(' ')
  return (
    <div className={cls} onClick={() => onChange(!checked)} style={variant === 'pregnant' ? { background: checked ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.05)', borderColor: checked ? 'rgba(52,211,153,0.35)' : 'rgba(52,211,153,0.2)', borderRadius: 10, padding: '12px 14px' } : {}}>
      <div className="chk-box">{checked ? '✓' : ''}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{desc}</div>}
      </div>
    </div>
  )
}

export default function CaseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState({ msg: '', type: '' })

  // Core fields
  const [patientId, setPatientId] = useState('')
  const [caseDate, setCaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [hospital, setHospital] = useState('')
  const [clinicalRole, setClinicalRole] = useState('')

  // Procedure
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [procedure, setProcedure] = useState('')
  const [detail, setDetail] = useState('')
  const [otherDetail, setOtherDetail] = useState('')

  // Notes
  const [obs, setObs] = useState('')

  // Obstetrics
  const [complications, setComplications] = useState([])
  const [otherComp, setOtherComp] = useState('')
  const [prevCs, setPrevCs] = useState('')
  const [sterilisation, setSterilisation] = useState(false)

  // ART
  const [pregnant, setPregnant] = useState(false)
  const [ooTrigger, setOoTrigger] = useState('')
  const [ooTriggerOther, setOoTriggerOther] = useState('')
  const [ooHours, setOoHours] = useState('')
  const [ooFollicles, setOoFollicles] = useState('')
  const [ooEggs, setOoEggs] = useState('')
  const [la, setLa] = useState(false)
  const [etNumber, setEtNumber] = useState('')

  // Gynaecology extras
  const [topGestation, setTopGestation] = useState('')
  const [uretericCath, setUretericCath] = useState(false)

  // Hospital autocomplete
  const [hospitals, setHospitals] = useState([])
  const [hospSuggestions, setHospSuggestions] = useState([])
  const hospRef = useRef(null)

  // Load hospitals for autocomplete
  useEffect(() => {
    api.users.hospitals().then((h) => setHospitals(h.map((x) => x.name))).catch(() => {})
  }, [])

  // Load existing case if editing
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    api.cases
      .get(id)
      .then((c) => {
        setPatientId(c.patient_id || '')
        setCaseDate(c.case_date || '')
        setHospital(c.hospital || '')
        setClinicalRole(c.clinical_role || '')
        setCategory(c.category || '')
        setType(c.type || '')
        setProcedure(c.procedure || '')
        setDetail(c.detail || '')
        setObs(c.obs || '')
        setComplications(c.complications || [])
        setPrevCs(c.prev_cs != null ? String(c.prev_cs) : '')
        setSterilisation(c.sterilisation || false)
        setPregnant(c.pregnant || false)
        if (c.oocyte_data) {
          setOoTrigger(c.oocyte_data.trigger || '')
          setOoHours(c.oocyte_data.hours != null ? String(c.oocyte_data.hours) : '')
          setOoFollicles(c.oocyte_data.follicles != null ? String(c.oocyte_data.follicles) : '')
          setOoEggs(c.oocyte_data.eggs_retrieved != null ? String(c.oocyte_data.eggs_retrieved) : '')
          setLa(c.oocyte_data.la || false)
        }
        if (c.et_data) {
          setEtNumber(c.et_data.embryos_transferred != null ? String(c.et_data.embryos_transferred) : '')
        }
        if (c.extra_data) {
          if (c.extra_data.top_gestation != null) setTopGestation(String(c.extra_data.top_gestation))
          if (c.extra_data.ureteric_catheterisation != null) setUretericCath(c.extra_data.ureteric_catheterisation)
        }
      })
      .catch(() => navigate('/cases'))
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  // Show/hide sections based on selections
  const showCaesarExtra = procedure === 'Caesarean Section'
  const showOocyteFields =
    procedure === 'Transvaginal Oocyte Collection' || procedure === 'Transabdominal Oocyte Collection'
  const isET = type === 'Embryo Transfer' || procedure === 'Embryo Transfer'
  const showEtFields = isET
  const showPregnant = category === 'ART' && (isET || showOocyteFields)
  const showComplications = category === 'Obstetrics'
  const showTopGestation =
    category === 'Gynaecology' &&
    procedure === 'Termination of Pregnancy'
  const showCystoscopy = category === 'Gynaecology' && type === 'Cystoscopy'

  // Types for selected category
  const types = getProcTypes(category)
  const procedures = getProcProcedures(category, type)
  const details = getProcDetails(category, type, procedure)

  const toggleComp = (label) => {
    setComplications((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    )
  }

  const showHospSuggestions = () => {
    const val = hospital.toLowerCase()
    if (!val) { setHospSuggestions([]); return }
    setHospSuggestions(hospitals.filter((h) => h.toLowerCase().includes(val)).slice(0, 8))
  }

  const handleSave = async () => {
    if (!patientId.trim() || !caseDate || !category) {
      setAlert({ msg: 'Please fill in Patient ID, Date, and Category.', type: 'error' })
      return
    }

    setSaving(true)
    setAlert({ msg: '', type: '' })

    try {
      const compsToSave = complications.map((c) => (c === 'Other' ? `Other: ${otherComp}` : c))

      const payload = {
        patient_id: patientId.trim(),
        case_date: caseDate,
        hospital: hospital.trim() || null,
        clinical_role: clinicalRole || null,
        category,
        type: type || null,
        procedure: procedure || null,
        detail: detail === 'Other' ? otherDetail || 'Other' : detail || null,
        obs: obs.trim() || null,
        pregnant,
        complications: compsToSave,
        prev_cs: showCaesarExtra && prevCs !== '' ? parseInt(prevCs) : null,
        sterilisation: showCaesarExtra ? sterilisation : false,
        oocyte_data: showOocyteFields
          ? {
              trigger: ooTrigger === 'Other' ? ooTriggerOther : ooTrigger,
              hours: ooHours !== '' ? parseFloat(ooHours) : null,
              follicles: ooFollicles !== '' ? parseInt(ooFollicles) : null,
              eggs_retrieved: ooEggs !== '' ? parseInt(ooEggs) : null,
              la,
            }
          : null,
        et_data: showEtFields
          ? { embryos_transferred: etNumber !== '' ? parseInt(etNumber) : null }
          : null,
        extra_data:
          showTopGestation || showCystoscopy
            ? {
                top_gestation: showTopGestation && topGestation !== '' ? parseInt(topGestation) : null,
                ureteric_catheterisation: showCystoscopy ? uretericCath : null,
              }
            : null,
      }

      if (isEdit) {
        await api.cases.update(id, payload)
      } else {
        await api.cases.create(payload)
        // Save hospital for autocomplete
        if (hospital.trim() && !hospitals.includes(hospital.trim())) {
          await api.users.addHospital(hospital.trim()).catch(() => {})
        }
      }

      setAlert({ msg: isEdit ? 'Case updated successfully.' : 'Case saved successfully.', type: 'success' })
      setTimeout(() => navigate('/cases'), 1200)
    } catch (err) {
      setAlert({ msg: err.message || 'Failed to save case.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="empty"><span className="spinner" /></div>
    )
  }

  const procBadgeParts = [category, type, procedure, detail === 'Other' ? otherDetail : detail].filter(Boolean)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{isEdit ? 'Edit Case' : 'New Case'}</div>
          <div className="page-sub">Record clinical observations and outcomes</div>
        </div>
      </div>

      <div className="card">
        {alert.msg && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

        {/* Patient & encounter */}
        <div className="form-section">
          <div className="form-section-title">Patient &amp; Encounter</div>
          <div className="form-row">
            <div className="field">
              <label>Patient ID (anonymised)</label>
              <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. PT-001" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Hospital</label>
            <div className="hospital-wrap" ref={hospRef}>
              <input
                type="text"
                value={hospital}
                onChange={(e) => { setHospital(e.target.value); showHospSuggestions() }}
                onFocus={showHospSuggestions}
                onBlur={() => setTimeout(() => setHospSuggestions([]), 200)}
                placeholder="Start typing hospital name…"
                autoComplete="off"
              />
              {hospSuggestions.length > 0 && (
                <div className="hospital-suggestions">
                  {hospSuggestions.map((h) => (
                    <div key={h} className="hosp-opt" onMouseDown={() => { setHospital(h); setHospSuggestions([]) }}>{h}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Procedure */}
        <div className="form-section">
          <div className="form-section-title">
            Procedure
            {procBadgeParts.length > 0 && (
              <span className="card-badge">{procBadgeParts.join(' › ')}</span>
            )}
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Role</label>
            <select value={clinicalRole} onChange={(e) => setClinicalRole(e.target.value)}>
              <option value="">Select role…</option>
              <option value="Primary Operator">Primary Operator</option>
              <option value="Assistant">Assistant</option>
              <option value="Supervisor">Supervisor</option>
            </select>
          </div>
          <div className="proc-row">
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setType(''); setProcedure(''); setDetail('') }}>
                <option value="">Select category…</option>
                <option value="ART">ART</option>
                <option value="Gynaecology">Gynaecology</option>
                <option value="Obstetrics">Obstetrics</option>
              </select>
            </div>

            {types.length > 0 && (
              <div className="field">
                <label>Type</label>
                <select value={type} onChange={(e) => { setType(e.target.value); setProcedure(''); setDetail('') }}>
                  <option value="">Select type…</option>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {procedures.length > 0 && (
              <div className="field">
                <label>Procedure</label>
                <select value={procedure} onChange={(e) => { setProcedure(e.target.value); setDetail('') }}>
                  <option value="">Select procedure…</option>
                  {[...procedures].sort((a, b) => a.localeCompare(b)).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {details.length > 0 && (
              <div className="field">
                <label>Detail</label>
                <select value={detail} onChange={(e) => setDetail(e.target.value)}>
                  <option value="">Select detail…</option>
                  {[...details].sort((a, b) => a.localeCompare(b)).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {detail === 'Other' && (
            <div className="field" style={{ marginTop: 12 }}>
              <label>Specify (Other)</label>
              <input type="text" value={otherDetail} onChange={(e) => setOtherDetail(e.target.value)} placeholder="Please specify…" />
            </div>
          )}

          {/* Caesarean extra */}
          {showCaesarExtra && (
            <div className="caesar-fields">
              <div className="form-section-title" style={{ color: 'var(--amber)' }}>Caesarean Details</div>
              <div className="form-row">
                <div className="field">
                  <label>Previous Caesarean Sections</label>
                  <input type="number" value={prevCs} onChange={(e) => setPrevCs(e.target.value)} min={0} max={10} placeholder="0" style={{ maxWidth: 100 }} />
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <Toggle checked={sterilisation} onChange={setSterilisation} label="Sterilisation performed" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ART: Oocyte fields */}
        {showOocyteFields && (
          <div className="form-section">
            <div className="form-section-title" style={{ color: 'var(--teal)' }}>Oocyte Collection Details</div>
            <div className="form-row">
              <div className="field">
                <label>Trigger</label>
                <select value={ooTrigger} onChange={(e) => setOoTrigger(e.target.value)}>
                  <option value="">Select trigger…</option>
                  <option value="Ovidrel">Ovidrel</option>
                  <option value="Decapeptyl">Decapeptyl</option>
                  <option value="Dual">Dual</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="field">
                <label>Hours post-trigger</label>
                <select value={ooHours} onChange={(e) => setOoHours(e.target.value)}>
                  <option value="">Select hours…</option>
                  {Array.from({ length: 49 }, (_, i) => i * 0.5).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
            {ooTrigger === 'Other' && (
              <div className="field">
                <label>Trigger (Other)</label>
                <input type="text" value={ooTriggerOther} onChange={(e) => setOoTriggerOther(e.target.value)} placeholder="Specify trigger…" />
              </div>
            )}
            <div className="form-row">
              <div className="field">
                <label>Follicles</label>
                <input type="number" value={ooFollicles} onChange={(e) => setOoFollicles(e.target.value)} min={0} placeholder="0" />
              </div>
              <div className="field">
                <label>Eggs Retrieved</label>
                <input type="number" value={ooEggs} onChange={(e) => setOoEggs(e.target.value)} min={0} placeholder="0" />
              </div>
            </div>
            <Toggle checked={la} onChange={setLa} label="Local Anaesthetic (LA)" />
          </div>
        )}

        {/* ART: Embryo Transfer */}
        {showEtFields && (
          <div className="form-section">
            <div className="form-section-title" style={{ color: 'var(--teal)' }}>Embryo Transfer Details</div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Number of Embryos Transferred</label>
              <input type="number" value={etNumber} onChange={(e) => setEtNumber(e.target.value)} min={0} max={10} placeholder="0" />
            </div>
          </div>
        )}

        {/* ART: Pregnant toggle */}
        {showPregnant && (
          <div style={{ marginBottom: 14 }}>
            <div
              className={'toggle-row pregnant' + (pregnant ? ' checked' : '')}
              onClick={() => setPregnant((p) => !p)}
            >
              <div className="chk-box" style={{ background: pregnant ? 'var(--green)' : undefined, borderColor: pregnant ? 'var(--green)' : undefined }}>
                {pregnant ? '✓' : ''}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Pregnant</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                  Retrospective flag — tick when pregnancy is confirmed
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gynaecology: Termination */}
        {showTopGestation && (
          <div className="form-section">
            <div className="form-section-title" style={{ color: 'var(--violet)' }}>Termination Details</div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Gestation (weeks)</label>
              <input type="number" value={topGestation} onChange={(e) => setTopGestation(e.target.value)} min={0} max={50} placeholder="0" />
            </div>
          </div>
        )}

        {/* Gynaecology: Cystoscopy */}
        {showCystoscopy && (
          <div className="form-section">
            <div className="form-section-title" style={{ color: 'var(--violet)' }}>Cystoscopy Details</div>
            <Toggle checked={uretericCath} onChange={setUretericCath} label="Ureteric Catheterisation" />
          </div>
        )}

        {/* Clinical Notes */}
        <div className="form-section">
          <div className="form-section-title">Clinical Notes</div>
          <div className="field">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Document clinical findings, symptoms, procedures…"
              style={{ minHeight: 140 }}
            />
          </div>
        </div>

        {/* Obstetrics: Complications */}
        {showComplications && (
          <div className="form-section">
            <div className="form-section-title" style={{ color: 'var(--rose)' }}>Complications</div>
            <div className="comp-grid">
              {COMPLICATIONS.map((comp) => (
                <div
                  key={comp.id}
                  className={'toggle-row danger' + (complications.includes(comp.label) ? ' checked' : '')}
                  onClick={() => toggleComp(comp.label)}
                >
                  <div className="chk-box" style={{
                    background: complications.includes(comp.label) ? 'var(--rose)' : undefined,
                    borderColor: complications.includes(comp.label) ? 'var(--rose)' : undefined
                  }}>
                    {complications.includes(comp.label) ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{comp.label}</span>
                </div>
              ))}
            </div>
            {complications.includes('Other') && (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Specify other complication</label>
                <input type="text" value={otherComp} onChange={(e) => setOtherComp(e.target.value)} placeholder="Describe complication…" />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? <span className="spinner" /> : isEdit ? 'Update Case' : 'Save Case'}
          </button>
          <button className="btn btn-glass" onClick={() => navigate('/cases')} style={{ width: 'auto' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
