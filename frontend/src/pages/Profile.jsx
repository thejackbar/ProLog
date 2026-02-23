import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

function fmt(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Profile() {
  const { user, setUser } = useAuth()
  const [alert, setAlert] = useState({ msg: '', type: '' })

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [clinicalRole, setClinicalRole] = useState('')

  // Password
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')

  // Qualifications
  const [quals, setQuals] = useState([])
  const [qName, setQName] = useState('')
  const [qDate, setQDate] = useState('')

  const showAlert = (msg, type) => {
    setAlert({ msg, type })
    setTimeout(() => setAlert({ msg: '', type: '' }), 4000)
  }

  useEffect(() => {
    if (!user) return
    const nameParts = (user.full_name || '').split(' ')
    setFirstName(user.first_name || nameParts[0] || '')
    setLastName(user.last_name || nameParts.slice(1).join(' ') || '')
    setEmail(user.email || '')
    setUsername(user.username || '')
    setClinicalRole(user.clinical_role || '')

    api.users.qualifications().then(setQuals).catch(() => {})
  }, [user])

  const saveProfile = async () => {
    if (!firstName || !lastName || !email || !username) {
      return showAlert('Please fill in all required fields.', 'error')
    }
    try {
      const updated = await api.users.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        clinical_role: clinicalRole,
      })
      setUser(updated)
      showAlert('Profile updated successfully.', 'success')
    } catch (err) {
      showAlert(err.message || 'Failed to update profile.', 'error')
    }
  }

  const changePassword = async () => {
    if (!curPass || !newPass || !confPass) return showAlert('Please fill in all password fields.', 'error')
    if (newPass.length < 6) return showAlert('New password must be at least 6 characters.', 'error')
    if (newPass !== confPass) return showAlert('New passwords do not match.', 'error')
    try {
      await api.users.changePassword({ current_password: curPass, new_password: newPass })
      setCurPass('')
      setNewPass('')
      setConfPass('')
      showAlert('Password changed successfully.', 'success')
    } catch (err) {
      showAlert(err.message || 'Failed to change password.', 'error')
    }
  }

  const addQual = async () => {
    if (!qName || !qDate) return showAlert('Please enter a qualification name and date.', 'error')
    try {
      const updated = await api.users.addQualification({ name: qName, date_obtained: qDate })
      setQuals(updated)
      setQName('')
      setQDate('')
    } catch (err) {
      showAlert(err.message || 'Failed to add qualification.', 'error')
    }
  }

  const deleteQual = async (id) => {
    if (!confirm('Remove this qualification?')) return
    try {
      const updated = await api.users.deleteQualification(id)
      setQuals(updated)
    } catch (err) {
      showAlert(err.message || 'Failed to remove qualification.', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-sub">Update your details and manage qualifications</div>
        </div>
      </div>

      {alert.msg && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="profile-grid">
        <div>
          <div className="card">
            <div className="card-title">Personal Details</div>
            <div className="form-row">
              <div className="field">
                <label>First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@clinic.com" />
            </div>
            <div className="field">
              <label>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jane.smith" />
            </div>
            <div className="field">
              <label>Title / Clinical Role</label>
              <input type="text" value={clinicalRole} onChange={(e) => setClinicalRole(e.target.value)} placeholder="e.g. Consultant Obstetrician" />
            </div>
            <button className="btn btn-teal btn-sm" onClick={saveProfile} style={{ width: 'auto', marginTop: 6 }}>
              Save Changes
            </button>
          </div>

          <div className="card">
            <div className="card-title">Change Password</div>
            <div className="field">
              <label>Current Password</label>
              <input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} placeholder="Current password" />
            </div>
            <div className="field">
              <label>New Password</label>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New password (min. 6 chars)" />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} placeholder="Confirm new password" />
            </div>
            <button className="btn btn-primary btn-sm" onClick={changePassword} style={{ width: 'auto' }}>
              Update Password
            </button>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title">Qualifications &amp; Certificates</div>
            <div style={{ marginBottom: 16 }}>
              {quals.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>
                  No qualifications added yet
                </div>
              ) : (
                quals.map((q) => (
                  <div
                    key={q.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{q.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmt(q.date_obtained)}</div>
                    </div>
                    <button className="btn btn-rose btn-sm" onClick={() => deleteQual(q.id)} style={{ width: 'auto' }}>×</button>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                Add New
              </div>
              <div className="field">
                <label>Qualification / Certificate Name</label>
                <input type="text" value={qName} onChange={(e) => setQName(e.target.value)} placeholder="e.g. MRCOG Part 2" />
              </div>
              <div className="field">
                <label>Date Obtained</label>
                <input type="date" value={qDate} onChange={(e) => setQDate(e.target.value)} />
              </div>
              <button className="btn btn-glass btn-sm" onClick={addQual} style={{ width: 'auto' }}>+ Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
