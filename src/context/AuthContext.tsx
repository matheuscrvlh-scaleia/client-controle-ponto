import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Cargo, Permissoes, Usuario } from '../types/database'

interface AuthState {
  session: Session | null
  usuario: Usuario | null
  cargos: Cargo[]
  permissoes: Permissoes
  loading: boolean
}

const permissoesVazias: Permissoes = {
  podeVerTodasFiliais: false,
  podeGerenciarExtracao: false,
  podeGerenciarUsuarios: false,
  podeGerenciarCargosFiliais: false,
  podeGerenciarConfiguracoes: false,
}

const estadoInicial: AuthState = {
  session: null,
  usuario: null,
  cargos: [],
  permissoes: permissoesVazias,
  loading: true,
}

const AuthContext = createContext<AuthState>(estadoInicial)

function mesclarPermissoes(cargos: Cargo[]): Permissoes {
  return cargos.reduce<Permissoes>(
    (acc, cargo) => ({
      podeVerTodasFiliais: acc.podeVerTodasFiliais || cargo.pode_ver_todas_filiais,
      podeGerenciarExtracao: acc.podeGerenciarExtracao || cargo.pode_gerenciar_extracao,
      podeGerenciarUsuarios: acc.podeGerenciarUsuarios || cargo.pode_gerenciar_usuarios,
      podeGerenciarCargosFiliais: acc.podeGerenciarCargosFiliais || cargo.pode_gerenciar_cargos_filiais,
      podeGerenciarConfiguracoes: acc.podeGerenciarConfiguracoes || cargo.pode_gerenciar_configuracoes,
    }),
    permissoesVazias,
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(estadoInicial)

  useEffect(() => {
    let ativo = true

    async function carregarPerfil(session: Session | null) {
      if (!session) {
        if (ativo) setState({ ...estadoInicial, loading: false })
        return
      }

      const [{ data: usuario }, { data: vinculos }] = await Promise.all([
        supabase.from('usuarios').select('*').eq('id', session.user.id).single(),
        supabase
          .from('usuario_cargos')
          .select('cargos(*)')
          .eq('usuario_id', session.user.id) as unknown as Promise<{
          data: { cargos: Cargo | Cargo[] | null }[] | null
        }>,
      ])

      const cargos = (vinculos ?? []).flatMap((vinculo) => {
        const cargo = vinculo.cargos
        if (!cargo) return []
        return Array.isArray(cargo) ? cargo : [cargo]
      })

      if (ativo) {
        setState({
          session,
          usuario: usuario ?? null,
          cargos,
          permissoes: mesclarPermissoes(cargos),
          loading: false,
        })
      }
    }

    supabase.auth.getSession().then(({ data }) => carregarPerfil(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      carregarPerfil(session)
    })

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
