import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: '⚡', label: 'Dashboard', end: true },
  { to: '/projects', icon: '📁', label: 'Projects' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">TaskFlow</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.map(({ to, icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: 12 }}>Admin</div>
              <div className="nav-item" style={{ opacity: 0.5, cursor: 'default', fontSize: '0.82rem' }}>
                <span className="nav-icon">🛡️</span>
                All Projects Visible
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">
              <span className={`role-badge ${user?.role}`}>{user?.role}</span>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={handleLogout}
            title="Logout"
            style={{ padding: '6px', fontSize: '1rem' }}
          >
            🚪
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
