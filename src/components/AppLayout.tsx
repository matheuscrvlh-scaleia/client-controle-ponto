import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import logo from '../assets/logos/logo.avif'

export function AppLayout() {
  const { usuario, cargos, permissoes } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  const podeAcessarAdmin =
    permissoes.podeGerenciarCargosFiliais ||
    permissoes.podeGerenciarUsuarios ||
    permissoes.podeGerenciarConfiguracoes ||
    permissoes.podeGerenciarExtracao

  function fecharMenu() {
    setMenuAberto(false)
  }

  return (
    <div className="app-shell">
      {menuAberto && <div className="app-sidebar-overlay" onClick={fecharMenu} />}

      <aside className={menuAberto ? 'app-sidebar open' : 'app-sidebar'}>
        <div className="app-sidebar-top">
          <div className="brand">
            <div className="brand-logo-wrap">
              <img src={logo} alt="Transcouto" className="brand-logo" />
            </div>
            <span>Copiloto de Ponto</span>
          </div>
          <div className="app-sidebar-top-actions">
            <ThemeToggle />
            <button
              type="button"
              className="app-sidebar-close"
              onClick={fecharMenu}
              aria-label="Fechar menu"
            >
              ×
            </button>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')} onClick={fecharMenu}>
            Início
          </NavLink>
          {podeAcessarAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')} onClick={fecharMenu}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="app-sidebar-bottom">
          <div className="user-info">
            <div className="user-name">{usuario?.nome ?? 'Usuário'}</div>
            <div className="user-cargos">
              {cargos.length ? cargos.map((cargo) => cargo.nome).join(', ') : 'Sem cargo atribuído'}
            </div>
          </div>
          <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </aside>

      <main className="app-main">
        <button type="button" className="app-menu-toggle" onClick={() => setMenuAberto(true)}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Menu
        </button>
        <Outlet />
      </main>
    </div>
  )
}
