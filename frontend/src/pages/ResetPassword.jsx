import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || !confirm) return setError('Please fill in both fields.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    if (!token) return setError('Missing reset token — please use the link from your email.')
    setError('')
    setLoading(true)
    try {
      await api.auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          P<span>L</span>
        </div>
        <div className="auth-tag">Fertility &amp; Gynaecology · Clinical Case Logbook</div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ marginBottom: 16 }}>Your password has been reset successfully.</p>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Sign In →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ margin: '16px 0 12px', fontSize: 16 }}>Set a new password</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <span className="spinner" /> : 'Reset Password →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
