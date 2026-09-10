import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminLayout() {
  const { permissoes } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  const links = [
    permissoes.podeGerenciarCargosFiliais && { to: '/admin/cargos', label: 'Cargos' },
    permissoes.podeGerenciarCargosFiliais && { to: '/admin/filiais', label: 'Filiais' },
    permissoes.podeGerenciarUsuarios && { to: '/admin/usuarios', label: 'Usuários' },
  ].filter((link): link is { to: string; label: string } => Boolean(link))

  return (
    <div className="admin-layout">
      <button type="button" className="admin-menu-toggle" onClick={() => setMenuAberto(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Cadastros
      </button>

      {menuAberto && <div className="admin-sidebar-overlay" onClick={() => setMenuAberto(false)} />}

      <aside className={menuAberto ? 'admin-sidebar open' : 'admin-sidebar'}>
        <div className="admin-sidebar-header">
          <span>Cadastros</span>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setMenuAberto(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  )
}
