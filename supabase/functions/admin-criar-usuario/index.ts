import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface Payload {
  nome: string
  email: string
  senha: string
  usuario?: string | null
  cpf?: string | null
  cargo_ids?: string[]
  filial_ids?: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Não autenticado.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Não autenticado.' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: vinculos } = await adminClient
    .from('usuario_cargos')
    .select('cargos(pode_gerenciar_usuarios)')
    .eq('usuario_id', callerData.user.id)

  const podeGerenciarUsuarios = (vinculos ?? []).some((vinculo) => {
    const cargo = Array.isArray(vinculo.cargos) ? vinculo.cargos[0] : vinculo.cargos
    return cargo?.pode_gerenciar_usuarios === true
  })

  if (!podeGerenciarUsuarios) {
    return jsonResponse({ error: 'Você não tem permissão para cadastrar usuários.' }, 403)
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const { nome, email, senha, usuario, cpf, cargo_ids: cargoIds, filial_ids: filialIds } = payload

  if (!nome?.trim() || !email?.trim() || !senha || senha.length < 6) {
    return jsonResponse({ error: 'Nome, e-mail e senha (mínimo 6 caracteres) são obrigatórios.' }, 400)
  }

  const { data: criado, error: erroCriacao } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nome.trim() },
  })

  if (erroCriacao || !criado.user) {
    return jsonResponse({ error: erroCriacao?.message ?? 'Não foi possível criar o usuário.' }, 400)
  }

  const novoId = criado.user.id

  const cpfLimpo = cpf?.trim() ? cpf.replace(/\D/g, '') : null
  const usuarioLimpo = usuario?.trim() || null

  if (usuarioLimpo || cpfLimpo) {
    const { error: erroAtualizacao } = await adminClient
      .from('usuarios')
      .update({ usuario: usuarioLimpo, cpf: cpfLimpo })
      .eq('id', novoId)

    if (erroAtualizacao) {
      await adminClient.auth.admin.deleteUser(novoId)
      return jsonResponse({ error: 'Usuário ou CPF já cadastrado para outra conta.' }, 400)
    }
  }

  if (cargoIds?.length) {
    await adminClient.from('usuario_cargos').insert(cargoIds.map((cargo_id) => ({ usuario_id: novoId, cargo_id })))
  }
  if (filialIds?.length) {
    await adminClient.from('usuario_filiais').insert(filialIds.map((filial_id) => ({ usuario_id: novoId, filial_id })))
  }

  return jsonResponse({ id: novoId })
})
