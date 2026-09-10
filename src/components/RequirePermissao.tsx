import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Permissoes } from '../types/database'

interface RequirePermissaoProps {
  chave: keyof Permissoes
}

export function RequirePermissao({ chave }: RequirePermissaoProps) {
  const { permissoes } = useAuth()

  if (!permissoes[chave]) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
