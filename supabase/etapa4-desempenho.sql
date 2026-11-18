-- ETAPA 4 — Desempenho: contagem de confirmados de vários eventos em UMA chamada
-- Rode uma vez no SQL Editor. Se não rodar, o app continua funcionando (usa o jeito antigo).
create or replace function public.totais_confirmados(ids uuid[])
returns table (evento_id uuid, total bigint)
language sql stable security invoker set search_path = public as $$
  select e, public.total_confirmados(e)::bigint from unnest(ids) as e;
$$;
revoke all on function public.totais_confirmados(uuid[]) from public, anon;
grant execute on function public.totais_confirmados(uuid[]) to authenticated;
