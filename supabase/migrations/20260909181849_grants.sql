-- Concede os privilegios de tabela que o PostgREST exige antes mesmo de
-- avaliar as policies de RLS (sem isso, service_role/authenticated recebem
-- "permission denied" independente das policies criadas na migration anterior).

grant usage on schema public to authenticated, service_role;

grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
