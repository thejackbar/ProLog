import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = (user?.full_name || user?.username || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-dot" />
          P<span>L</span>
        </div>

        <div className="nav-label">Overview</div>
        <NavLink to="/dashboard" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="nav-icon">◈</span>Dashboard
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="nav-icon">◎</span>Analytics
        </NavLink>

        <div className="nav-label">Cases</div>
        <NavLink to="/cases" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="nav-icon">⊡</span>All Cases
        </NavLink>
        <NavLink to="/cases/new" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="nav-icon">⊕</span>New Case
        </NavLink>

        <div className="nav-label">Intelligence</div>
        <NavLink to="/ai" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="nav-icon">✦</span>AI Patterns
        </NavLink>

        <div className="sidebar-footer">
          <div className="user-chip" onClick={() => navigate('/profile')}>
            <div className="user-avatar">{initials}</div>
            <div className="user-meta">
              <div className="user-name">{user?.full_name || user?.username}</div>
              <div className="user-sub">My Profile</div>
            </div>
            <button
              className="btn-signout"
              onClick={(e) => {
                e.stopPropagation()
                handleLogout()
              }}
              title="Sign out"
            >
              ⏻
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
