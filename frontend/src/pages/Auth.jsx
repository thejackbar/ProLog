import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import logoSrc from '../assets/prolog-logo.png'

export default function Auth() {
  const [tab, setTab] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Login fields
  const [liUser, setLiUser] = useState('')
  const [liPass, setLiPass] = useState('')

  // Forgot password fields
  const [fpEmail, setFpEmail] = useState('')

  // Register fields
  const [rgFirst, setRgFirst] = useState('')
  const [rgLast, setRgLast] = useState('')
  const [rgUser, setRgUser] = useState('')
  const [rgEmail, setRgEmail] = useState('')
  const [rgPass, setRgPass] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()

  const autoUsername = (first, last) => {
    const f = first.trim().toLowerCase().replace(/\s+/g, '')
    const l = last.trim().toLowerCase().replace(/\s+/g, '')
    if (f || l) setRgUser([f, l].filter(Boolean).join('.'))
  }

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!liUser || !liPass) return setError('Please fill in both fields.')
    setError('')
    setLoading(true)
    try {
      await login({ username: liUser, password: liPass })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e?.preventDefault()
    if (!fpEmail) return setError('Please enter your email address.')
    setError('')
    setLoading(true)
    try {
      await api.auth.forgotPassword(fpEmail)
      setForgotSent(true)
    } catch {
      // Always show success to avoid email enumeration
      setForgotSent(true)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e?.preventDefault()
    if (!rgFirst || !rgLast || !rgUser || !rgEmail || !rgPass)
      return setError('Please fill in all fields.')
    if (rgPass.length < 6) return setError('Password must be at least 6 characters.')
    setError('')
    setLoading(true)
    try {
      await api.auth.register({
        first_name: rgFirst,
        last_name: rgLast,
        username: rgUser,
        email: rgEmail,
        password: rgPass,
      })
      await login({ username: rgUser, password: rgPass })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoSrc} alt="ProLog" className="auth-logo-img" />
        </div>
        <div className="auth-tag">Fertility &amp; Gynaecology · Clinical Case Logbook</div>

        {tab !== 'forgot' && (
          <div className="tab-row">
            <button className={'tab-btn' + (tab === 'login' ? ' active' : '')} onClick={() => { setTab('login'); setError(''); setForgotSent(false) }}>
              Sign In
            </button>
            <button className={'tab-btn' + (tab === 'register' ? ' active' : '')} onClick={() => { setTab('register'); setError(''); setForgotSent(false) }}>
              Register
            </button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'forgot' ? (
          forgotSent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ marginBottom: 16 }}>If that email is registered, you'll receive a reset link shortly.</p>
              <button className="btn btn-ghost" onClick={() => { setTab('login'); setForgotSent(false); setFpEmail('') }}>
                ← Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <p style={{ marginBottom: 16, color: 'var(--muted)', fontSize: 14 }}>
                Enter your account email and we'll send you a reset link.
              </p>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  autoComplete="email"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? <span className="spinner" /> : 'Send Reset Link →'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }}
                onClick={() => { setTab('login'); setError('') }}>
                ← Back to Sign In
              </button>
            </form>
          )
        ) : tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                value={liUser}
                onChange={(e) => setLiUser(e.target.value)}
                placeholder="your.username"
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={liPass}
                onChange={(e) => setLiPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <span className="spinner" /> : 'Sign In →'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }}
              onClick={() => { setTab('forgot'); setError('') }}>
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <div className="field">
                <label>First Name</label>
                <input
                  type="text"
                  value={rgFirst}
                  onChange={(e) => { setRgFirst(e.target.value); autoUsername(e.target.value, rgLast) }}
                  placeholder="Jane"
                />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input
                  type="text"
                  value={rgLast}
                  onChange={(e) => { setRgLast(e.target.value); autoUsername(rgFirst, e.target.value) }}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  value={rgUser}
                  onChange={(e) => setRgUser(e.target.value)}
                  placeholder="jane.smith"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={rgEmail}
                  onChange={(e) => setRgEmail(e.target.value)}
                  placeholder="jane@clinic.com"
                />
              </div>
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={rgPass}
                onChange={(e) => setRgPass(e.target.value)}
                placeholder="min. 6 characters"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <span className="spinner" /> : 'Create Account →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
