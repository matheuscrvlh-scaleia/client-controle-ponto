-- Permite login por e-mail, usuario ou CPF.
-- Supabase Auth so autentica por e-mail (ou telefone), entao guardamos
-- usuario/cpf em public.usuarios e resolvemos para o e-mail correspondente
-- antes de chamar signInWithPassword no client.

alter table public.usuarios
  add column usuario text unique,
  add column cpf text unique;

-- Funcao publica (pre-login, sem sessao) que resolve usuario/cpf -> email.
-- Security definer para poder ler usuarios mesmo sem RLS de sessao; a
-- superficie exposta e minima (so o e-mail de uma correspondencia exata).
create or replace function public.login_email_de(p_identificador text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from usuarios
  where ativo
    and (
      usuario = p_identificador
      or (cpf is not null and cpf = regexp_replace(p_identificador, '\D', '', 'g'))
    )
  limit 1;
$$;

revoke all on function public.login_email_de(text) from public;
grant execute on function public.login_email_de(text) to anon, authenticated;
