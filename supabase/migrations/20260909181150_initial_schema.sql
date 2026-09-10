-- Copiloto de Ponto — Transcouto
-- Fase 0: modelo de dados completo (cargos, filiais, usuarios, funcionarios,
-- fechamentos, registros_horas, configuracoes, execucoes_extracao) + RLS.

create extension if not exists pgcrypto;

-- ============================================================
-- Cargos (papeis com permissoes configuraveis via CRUD)
-- ============================================================
create table public.cargos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  pode_ver_todas_filiais boolean not null default false,
  pode_gerenciar_extracao boolean not null default false,
  pode_gerenciar_usuarios boolean not null default false,
  pode_gerenciar_cargos_filiais boolean not null default false,
  pode_gerenciar_configuracoes boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Filiais (unidades) — resolve o mapeamento nome interno x
-- razao social/CNPJ registrado no FriPonto
-- ============================================================
create table public.filiais (
  id uuid primary key default gen_random_uuid(),
  nome_interno text not null unique,
  razao_social_friponto text not null,
  cnpj text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Usuarios (perfil 1:1 com auth.users)
-- ============================================================
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Usuario <-> Cargo (m:n) — um usuario pode ter varios cargos
create table public.usuario_cargos (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  cargo_id uuid not null references public.cargos (id) on delete cascade,
  primary key (usuario_id, cargo_id)
);
create index usuario_cargos_cargo_id_idx on public.usuario_cargos (cargo_id);

-- Usuario <-> Filial (m:n) — quais filiais o usuario enxerga
-- (ignorado se algum cargo do usuario tiver pode_ver_todas_filiais)
create table public.usuario_filiais (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  filial_id uuid not null references public.filiais (id) on delete cascade,
  primary key (usuario_id, filial_id)
);
create index usuario_filiais_filial_id_idx on public.usuario_filiais (filial_id);

-- ============================================================
-- Funcionarios (sincronizados do FriPonto, ou seed nas fases iniciais)
-- ============================================================
create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  filial_id uuid not null references public.filiais (id) on delete cascade,
  matricula_friponto text,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index funcionarios_filial_id_idx on public.funcionarios (filial_id);

-- ============================================================
-- Fechamentos — "congelamento" semanal/mensal dos dados
-- ============================================================
create table public.fechamentos (
  id uuid primary key default gen_random_uuid(),
  filial_id uuid not null references public.filiais (id) on delete cascade,
  tipo text not null check (tipo in ('semanal', 'mensal')),
  data_referencia_inicio date not null,
  data_referencia_fim date not null,
  data_execucao timestamptz,
  status text not null default 'processando' check (status in ('processando', 'sucesso', 'erro')),
  erro_mensagem text,
  created_at timestamptz not null default now()
);
create index fechamentos_filial_id_idx on public.fechamentos (filial_id);
create index fechamentos_filial_data_fim_idx on public.fechamentos (filial_id, tipo, data_referencia_fim desc);

-- ============================================================
-- Registros de horas — um por funcionario por fechamento
-- ============================================================
create table public.registros_horas (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references public.fechamentos (id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios (id) on delete cascade,
  horas_extras_pagas numeric(10, 2) not null default 0,
  horas_banco numeric(10, 2) not null default 0,
  horas_negativas numeric(10, 2) not null default 0,
  saldo_banco_acumulado numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (fechamento_id, funcionario_id)
);
create index registros_horas_fechamento_id_idx on public.registros_horas (fechamento_id);
create index registros_horas_funcionario_id_idx on public.registros_horas (funcionario_id);

-- ============================================================
-- Configuracoes — parametros de negocio editaveis sem deploy
-- (ex: teto de pagamento de horas extras)
-- ============================================================
create table public.configuracoes (
  chave text primary key,
  valor text not null,
  descricao text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Execucoes de extracao — log para o Painel Admin
-- ============================================================
create table public.execucoes_extracao (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('semanal', 'mensal', 'manual')),
  filial_id uuid references public.filiais (id) on delete set null,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  status text not null default 'processando' check (status in ('processando', 'sucesso', 'erro')),
  log_detalhado jsonb,
  disparado_por uuid references public.usuarios (id) on delete set null
);
create index execucoes_extracao_filial_id_idx on public.execucoes_extracao (filial_id);

-- ============================================================
-- Funcoes helper de permissao (security definer para uso em RLS)
-- ============================================================
create or replace function public.usuario_pode_ver_todas_filiais()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from usuario_cargos uc
    join cargos c on c.id = uc.cargo_id
    where uc.usuario_id = auth.uid() and c.pode_ver_todas_filiais
  );
$$;

create or replace function public.usuario_pode_gerenciar_extracao()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from usuario_cargos uc
    join cargos c on c.id = uc.cargo_id
    where uc.usuario_id = auth.uid() and c.pode_gerenciar_extracao
  );
$$;

create or replace function public.usuario_pode_gerenciar_usuarios()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from usuario_cargos uc
    join cargos c on c.id = uc.cargo_id
    where uc.usuario_id = auth.uid() and c.pode_gerenciar_usuarios
  );
$$;

create or replace function public.usuario_pode_gerenciar_cargos_filiais()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from usuario_cargos uc
    join cargos c on c.id = uc.cargo_id
    where uc.usuario_id = auth.uid() and c.pode_gerenciar_cargos_filiais
  );
$$;

create or replace function public.usuario_pode_gerenciar_configuracoes()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from usuario_cargos uc
    join cargos c on c.id = uc.cargo_id
    where uc.usuario_id = auth.uid() and c.pode_gerenciar_configuracoes
  );
$$;

create or replace function public.usuario_tem_acesso_filial(p_filial_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.usuario_pode_ver_todas_filiais()
    or exists (
      select 1
      from usuario_filiais uf
      where uf.usuario_id = auth.uid() and uf.filial_id = p_filial_id
    );
$$;

-- ============================================================
-- Trigger: cria a linha em public.usuarios ao criar o auth.users
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: atualiza updated_at em configuracoes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger configuracoes_set_updated_at
  before update on public.configuracoes
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.cargos enable row level security;
alter table public.filiais enable row level security;
alter table public.usuarios enable row level security;
alter table public.usuario_cargos enable row level security;
alter table public.usuario_filiais enable row level security;
alter table public.funcionarios enable row level security;
alter table public.fechamentos enable row level security;
alter table public.registros_horas enable row level security;
alter table public.configuracoes enable row level security;
alter table public.execucoes_extracao enable row level security;

-- cargos: leitura liberada para todo autenticado (necessario para o app
-- resolver as proprias permissoes); gestao restrita
create policy cargos_select on public.cargos
  for select to authenticated
  using (true);
create policy cargos_manage on public.cargos
  for all to authenticated
  using (public.usuario_pode_gerenciar_cargos_filiais())
  with check (public.usuario_pode_gerenciar_cargos_filiais());

-- filiais: leitura restrita as filiais que o usuario acessa (ou gestor de
-- cargos/filiais, que enxerga todas para fins de mapeamento/CRUD)
create policy filiais_select on public.filiais
  for select to authenticated
  using (
    public.usuario_tem_acesso_filial(id)
    or public.usuario_pode_gerenciar_cargos_filiais()
  );
create policy filiais_manage on public.filiais
  for all to authenticated
  using (public.usuario_pode_gerenciar_cargos_filiais())
  with check (public.usuario_pode_gerenciar_cargos_filiais());

-- usuarios: cada usuario ve o proprio perfil; gestor de usuarios ve todos
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (id = auth.uid() or public.usuario_pode_gerenciar_usuarios());
create policy usuarios_manage on public.usuarios
  for all to authenticated
  using (public.usuario_pode_gerenciar_usuarios())
  with check (public.usuario_pode_gerenciar_usuarios());

-- usuario_cargos / usuario_filiais: mesmo padrao (visao propria + gestor de usuarios)
create policy usuario_cargos_select on public.usuario_cargos
  for select to authenticated
  using (usuario_id = auth.uid() or public.usuario_pode_gerenciar_usuarios());
create policy usuario_cargos_manage on public.usuario_cargos
  for all to authenticated
  using (public.usuario_pode_gerenciar_usuarios())
  with check (public.usuario_pode_gerenciar_usuarios());

create policy usuario_filiais_select on public.usuario_filiais
  for select to authenticated
  using (usuario_id = auth.uid() or public.usuario_pode_gerenciar_usuarios());
create policy usuario_filiais_manage on public.usuario_filiais
  for all to authenticated
  using (public.usuario_pode_gerenciar_usuarios())
  with check (public.usuario_pode_gerenciar_usuarios());

-- funcionarios: leitura por acesso a filial; gestao por quem gerencia extracao
create policy funcionarios_select on public.funcionarios
  for select to authenticated
  using (public.usuario_tem_acesso_filial(filial_id));
create policy funcionarios_manage on public.funcionarios
  for all to authenticated
  using (public.usuario_pode_gerenciar_extracao())
  with check (public.usuario_pode_gerenciar_extracao());

-- fechamentos: leitura por acesso a filial; gestao por quem gerencia extracao
create policy fechamentos_select on public.fechamentos
  for select to authenticated
  using (public.usuario_tem_acesso_filial(filial_id));
create policy fechamentos_manage on public.fechamentos
  for all to authenticated
  using (public.usuario_pode_gerenciar_extracao())
  with check (public.usuario_pode_gerenciar_extracao());

-- registros_horas: leitura via acesso a filial do fechamento associado
create policy registros_horas_select on public.registros_horas
  for select to authenticated
  using (
    exists (
      select 1
      from fechamentos f
      where f.id = registros_horas.fechamento_id
        and public.usuario_tem_acesso_filial(f.filial_id)
    )
  );
create policy registros_horas_manage on public.registros_horas
  for all to authenticated
  using (public.usuario_pode_gerenciar_extracao())
  with check (public.usuario_pode_gerenciar_extracao());

-- configuracoes: restrito a quem gerencia configuracoes
create policy configuracoes_select on public.configuracoes
  for select to authenticated
  using (public.usuario_pode_gerenciar_configuracoes());
create policy configuracoes_manage on public.configuracoes
  for all to authenticated
  using (public.usuario_pode_gerenciar_configuracoes())
  with check (public.usuario_pode_gerenciar_configuracoes());

-- execucoes_extracao: restrito a quem gerencia extracao (Painel Admin)
create policy execucoes_extracao_select on public.execucoes_extracao
  for select to authenticated
  using (public.usuario_pode_gerenciar_extracao());
create policy execucoes_extracao_manage on public.execucoes_extracao
  for all to authenticated
  using (public.usuario_pode_gerenciar_extracao())
  with check (public.usuario_pode_gerenciar_extracao());

-- ============================================================
-- Seed inicial
-- ============================================================
insert into public.cargos (
  nome, pode_ver_todas_filiais, pode_gerenciar_extracao,
  pode_gerenciar_usuarios, pode_gerenciar_cargos_filiais, pode_gerenciar_configuracoes
) values (
  'Administrador', true, true, true, true, true
);

insert into public.configuracoes (chave, valor, descricao) values (
  'limite_horas_extras_pagas_semanal',
  '10',
  'Placeholder — ajustar com o valor real do negocio. Quantidade maxima de horas extras semanais pagas; o excedente vai para o banco de horas.'
);
