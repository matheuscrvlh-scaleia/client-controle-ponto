import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAdmin() {
  const { permissoes } = useAuth()

  const podeAcessarAdmin =
    permissoes.podeGerenciarCargosFiliais ||
    permissoes.podeGerenciarUsuarios ||
    permissoes.podeGerenciarConfiguracoes ||
    permissoes.podeGerenciarExtracao

  if (!podeAcessarAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
