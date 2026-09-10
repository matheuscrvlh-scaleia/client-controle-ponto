export interface Cargo {
  id: string
  nome: string
  pode_ver_todas_filiais: boolean
  pode_gerenciar_extracao: boolean
  pode_gerenciar_usuarios: boolean
  pode_gerenciar_cargos_filiais: boolean
  pode_gerenciar_configuracoes: boolean
  created_at: string
}

export interface Filial {
  id: string
  nome_interno: string
  razao_social_friponto: string
  cnpj: string | null
  ativo: boolean
  created_at: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  usuario: string | null
  cpf: string | null
  ativo: boolean
  created_at: string
}

export interface Permissoes {
  podeVerTodasFiliais: boolean
  podeGerenciarExtracao: boolean
  podeGerenciarUsuarios: boolean
  podeGerenciarCargosFiliais: boolean
  podeGerenciarConfiguracoes: boolean
}
