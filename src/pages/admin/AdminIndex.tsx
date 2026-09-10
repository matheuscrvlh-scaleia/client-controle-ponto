import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminIndex() {
  const { permissoes } = useAuth()

  if (permissoes.podeGerenciarCargosFiliais) {
    return <Navigate to="/admin/cargos" replace />
  }
  if (permissoes.podeGerenciarUsuarios) {
    return <Navigate to="/admin/usuarios" replace />
  }
  return <Navigate to="/" replace />
}
