import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { RequireAuth } from './components/RequireAuth'
import { RequireAdmin } from './components/RequireAdmin'
import { RequirePermissao } from './components/RequirePermissao'
import { AppLayout } from './components/AppLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminIndex } from './pages/admin/AdminIndex'
import { CargosPanel } from './pages/admin/cadastros/CargosPanel'
import { FiliaisPanel } from './pages/admin/cadastros/FiliaisPanel'
import { UsuariosPanel } from './pages/admin/cadastros/UsuariosPanel'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminIndex />} />
                    <Route element={<RequirePermissao chave="podeGerenciarCargosFiliais" />}>
                      <Route path="cargos" element={<CargosPanel />} />
                      <Route path="filiais" element={<FiliaisPanel />} />
                    </Route>
                    <Route element={<RequirePermissao chave="podeGerenciarUsuarios" />}>
                      <Route path="usuarios" element={<UsuariosPanel />} />
                    </Route>
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
